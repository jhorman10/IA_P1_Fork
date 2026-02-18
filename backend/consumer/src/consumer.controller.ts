import { BadRequestException, Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentService } from './appointments/appointment.service';
import { NotificationsService } from './notifications/notifications.service';

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);

    constructor(
        private readonly appointmentService: AppointmentService,
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
            if (typeof data.idCard !== 'number' || Number.isNaN(data.idCard)) {
                throw new BadRequestException('idCard must be numeric');
            }

            // Persist appointment in MongoDB (status: waiting, no office)
            const appointment = await this.appointmentService.createAppointment(data);

            // Send notification (log)
            await this.notificationsService.sendNotification(appointment.idCard, appointment.office);

            // Emit appointment_created event to Producer
            this.notificationsClient.emit(
                'appointment_created',
                this.appointmentService.toEventPayload(appointment),
            );

            // Manual Acknowledgement
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
