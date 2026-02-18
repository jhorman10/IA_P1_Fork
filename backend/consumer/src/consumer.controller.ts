import { BadRequestException, Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { NotificationsService } from './notifications/notifications.service';
import { Appointment } from './domain/entities/appointment.entity';
import { RegisterAppointmentUseCase } from './domain/ports/inbound/register-appointment.use-case';

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);

    constructor(
        @Inject('RegisterAppointmentUseCase')
        private readonly registerUseCase: RegisterAppointmentUseCase,
        private readonly notificationsService: NotificationsService,
        @Inject('APPOINTMENT_NOTIFICATIONS') private readonly notificationsClient: ClientProxy,
    ) { }

    @EventPattern('create_appointment')
    async handleCreateAppointment(
        @Payload() data: CreateAppointmentDto,
        @Ctx() context: RmqContext,
    ): Promise<void> {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        const properties = originalMsg?.properties || {};
        const headers = properties.headers || {};
        const retryCount = this.getRetryCount(headers);

        try {
            // Business Logic delegation
            const appointment = await this.registerUseCase.execute(data);

            // Side effects (Notifications)
            await this.notificationsService.sendNotification(appointment.idCard, appointment.office);

            // Send to dashboard via WebSocket (Socket.IO)
            this.notificationsClient.emit(
                'appointment_created',
                this.appointmentCreatedPayload(appointment),
            );

            channel.ack(originalMsg);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error processing patient ${data.idCard}: ${message}`);

            // ⚕️ HUMAN CHECK - Error Handling: Move to DLQ if validation fails or max retries reached
            if (message.includes('must be numeric')) { // Example of a specific fatal validation error
                this.logger.error(`Fatal validation error for patient ${data.idCard}: ${message}. Moving to DLQ.`);
                channel.nack(originalMsg, false, false); // No requeue, sends to DLQ
                return;
            } else if (error instanceof BadRequestException) {
                this.logger.error(`Fatal validation error for patient ${data.idCard}: ${message}. Moving to DLQ.`);
                // Fatal error: No requeue, sends to DLQ because of x-dead-letter-exchange config
                channel.nack(originalMsg, false, false);
            } else if (retryCount >= 2) { // Assuming max 3 attempts (0, 1, 2)
                this.logger.error(`Max retries (3) reached for patient ${data.idCard}: ${message}. Moving to DLQ.`);
                // Max retries reached: No requeue, sends to DLQ
                channel.nack(originalMsg, false, false);
            } else {
                this.logger.warn(`Transient error for patient ${data.idCard}: ${message}. Requeuing (Retry ${retryCount + 1}/3)...`);
                // Transient error: Requeue. 
                channel.nack(originalMsg, false, true);
            }
        }
    }

    /**
     * Maps an Appointment entity to a transport-agnostic payload.
     */
    private appointmentCreatedPayload(appointment: Appointment): any {
        return {
            id: appointment.id,
            fullName: appointment.fullName,
            idCard: appointment.idCard,
            office: appointment.office,
            status: appointment.status,
            priority: appointment.priority,
            timestamp: appointment.timestamp,
            completedAt: appointment.completedAt,
        };
    }

    /**
     * Extracts retry count from RabbitMQ x-death header.
     */
    private getRetryCount(headers: any): number {
        const xDeath = headers['x-death'];
        if (!xDeath || !Array.isArray(xDeath) || xDeath.length === 0) {
            return 0;
        }
        // Returns the sum of counts across all death entries
        return xDeath.reduce((acc, entry) => acc + (entry.count || 0), 0);
    }
}
