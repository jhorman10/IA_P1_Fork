import { CompleteExpiredAppointmentsUseCase } from '../../domain/ports/inbound/complete-expired-appointments.use-case';
import { AppointmentRepository } from '../../domain/ports/outbound/appointment.repository';
import { NotificationPort } from '../../domain/ports/outbound/notification.port';

export class CompleteExpiredAppointmentsUseCaseImpl implements CompleteExpiredAppointmentsUseCase {
    constructor(
        private readonly appointmentRepository: AppointmentRepository,
        private readonly notificationPort: NotificationPort,
    ) { }

    async execute(): Promise<void> {
        const now = Date.now();
        const expired = await this.appointmentRepository.findExpiredCalled(now);

        for (const app of expired) {
            app.complete();
            await this.appointmentRepository.save(app);
            await this.notificationPort.notifyAppointmentUpdated(app);
        }
    }
}
