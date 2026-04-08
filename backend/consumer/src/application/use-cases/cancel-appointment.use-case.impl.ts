import { CancelAppointmentUseCase } from "../../domain/ports/inbound/cancel-appointment.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";

/**
 * SPEC-012: Cancels a waiting appointment.
 * Follows hexagonal architecture — depends only on domain ports.
 */
export class CancelAppointmentUseCaseImpl implements CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly logger: LoggerPort,
    private readonly notificationPort: NotificationPort,
  ) {}

  async execute(appointmentId: string): Promise<void> {
    const appointment =
      await this.appointmentRepository.findById(appointmentId);

    if (!appointment || appointment.status !== "waiting") {
      this.logger.log(
        `[SKIP] cancel: appointment ${appointmentId} not found or not in waiting status`,
      );
      return;
    }

    appointment.cancel();
    const saved = await this.appointmentRepository.save(appointment);

    await this.notificationPort.notifyAppointmentUpdated(saved);
    this.logger.log(`Appointment ${appointmentId} cancelled successfully`);
  }
}
