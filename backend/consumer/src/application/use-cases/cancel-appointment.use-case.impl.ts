import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { CancelAppointmentUseCase } from "../../domain/ports/inbound/cancel-appointment.use-case";

/**
 * SPEC-012: Cancels a waiting appointment.
 * Follows hexagonal architecture — depends only on domain ports.
 */
export class CancelAppointmentUseCaseImpl implements CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly logger: LoggerPort,
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
    await this.appointmentRepository.save(appointment);

    this.logger.log(`Appointment ${appointmentId} cancelled successfully`);
  }
}
