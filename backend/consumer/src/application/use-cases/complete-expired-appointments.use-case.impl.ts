import { CompleteExpiredAppointmentsUseCase } from "../../domain/ports/inbound/complete-expired-appointments.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { ClockPort } from "../../domain/ports/outbound/clock.port";

export class CompleteExpiredAppointmentsUseCaseImpl implements CompleteExpiredAppointmentsUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly notificationPort: NotificationPort,
    private readonly logger: LoggerPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(): Promise<void> {
    const now = this.clock.now();
    const expired = await this.appointmentRepository.findExpiredCalled(now);

    for (const app of expired) {
      app.complete();
      await this.appointmentRepository.save(app);
      await this.notificationPort.notifyAppointmentUpdated(app);
    }
    if (expired.length > 0) {
      this.logger.log(
        `Completed ${expired.length} expired appointments`,
        "CompleteExpiredAppointmentsUseCase",
      );
    }
  }
}
