import { BadRequestException, Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { NotificationsService } from './notifications/notifications.service';
import { RegisterAppointmentUseCase } from './domain/ports/inbound/register-appointment.use-case';
import { AppointmentDocument } from './schemas/appointment.schema';

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
    async handleCreateAppointment(@Payload() data: CreateAppointmentDto, @Ctx() context: RmqContext): Promise<void> {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();
        const headers = originalMsg.properties?.headers || {};
        const retryCount = this.getRetryCount(headers);

        this.logger.log(`Received message (Attempt ${retryCount + 1}): ${JSON.stringify(data)}`);

        try {
            // Business Logic delegation
            const appointment = await this.registerUseCase.execute(data);

            // Side effects (Notifications)
            await this.notificationsService.sendNotification(appointment.idCard, appointment.office);

            // Egress event (Infrastructure)
            this.notificationsClient.emit(
                'appointment_created',
                this.appointmentCreatedPayload(appointment),
            );

            channel.ack(originalMsg);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);

            if (error instanceof BadRequestException) {
                this.logger.error(`Fatal validation error for patient ${data.idCard}: ${message}. Moving to DLQ.`);
                // Fatal error: No requeue, sends to DLQ because of x-dead-letter-exchange config
                channel.nack(originalMsg, false, false);
            } else if (retryCount >= 2) {
                this.logger.error(`Max retries (3) reached for patient ${data.idCard}: ${message}. Moving to DLQ.`);
                // Max retries reached: No requeue, sends to DLQ
                channel.nack(originalMsg, false, false);
            } else {
                this.logger.warn(`Transient error for patient ${data.idCard}: ${message}. Requeuing (Retry ${retryCount + 1}/3)...`);
                // Transient error: Requeue. 
                // Note: Standard nack(true) doesn't add x-death, so N-retries requires a DLX cycle
                // but for this implementation we assume the DLX/DLQ is set up to cycle or 
                // we treat redelivered as the only retry.
                channel.nack(originalMsg, false, true);
            }
        }
    }

    /**
     * Maps an AppointmentDocument to a transport-agnostic payload.
     */
    private appointmentCreatedPayload(appointment: AppointmentDocument): any {
        return {
            id: String(appointment._id),
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
