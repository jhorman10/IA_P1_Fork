import { BadRequestException, Controller, Inject, Logger } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { TurnosService } from './appointments/turnos.service';
import { NotificationsService } from './notifications/notifications.service';

@Controller()
export class ConsumerController {
    private readonly logger = new Logger(ConsumerController.name);

    constructor(
        private readonly turnosService: TurnosService,
        private readonly notificationsService: NotificationsService,
        @Inject('TURNOS_NOTIFICATIONS') private readonly notificationsClient: ClientProxy,
    ) { }

    @EventPattern('create_appointment')
    async handleCreateAppointment(@Payload() data: CreateAppointmentDto, @Ctx() context: RmqContext): Promise<void> {
        const channel = context.getChannelRef();
        const originalMsg = context.getMessage();

        this.logger.log(`Received message: ${JSON.stringify(data)}`);

        try {
            if (typeof data.idCard !== 'number' || Number.isNaN(data.idCard)) {
                throw new BadRequestException('idCard must be numeric');
            }

            // Persist appointment in MongoDB (status: waiting, no office)
            const appointment = await this.turnosService.createAppointment(data);
            this.logger.log(
                `Appointment created for patient ${appointment.idCard} — ID: ${appointment._id}`,
            );

            // Send notification (log)
            await this.notificationsService.sendNotification(String(appointment.idCard), appointment.office);

            // Emit appointment_created event to Producer
            this.notificationsClient.emit(
                'appointment_created',
                this.turnosService.toEventPayload(appointment),
            );

            // Manual Acknowledgement
            channel.ack(originalMsg);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error processing message: ${message}`);

            if (error instanceof BadRequestException) {
                channel.nack(originalMsg, false, false);
            } else {
                channel.nack(originalMsg, false, true);
            }
        }
    }
}
