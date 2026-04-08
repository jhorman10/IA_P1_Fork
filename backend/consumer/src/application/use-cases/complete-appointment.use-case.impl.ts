import { CompleteAppointmentUseCase } from "../../domain/ports/inbound/complete-appointment.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";

/**
 * SPEC-012: Completes an appointment and releases the assigned doctor.
 * Follows hexagonal architecture — depends only on domain ports.
 */
export class CompleteAppointmentUseCaseImpl implements CompleteAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly doctorRepository: DoctorRepository,
    private readonly logger: LoggerPort,
  ) {}

  async execute(appointmentId: string): Promise<void> {
    const appointment =
      await this.appointmentRepository.findById(appointmentId);

    if (!appointment || appointment.status !== "called") {
      this.logger.log(
        `[SKIP] complete: appointment ${appointmentId} not found or not in called status`,
      );
      return;
    }

    appointment.complete();
    const saved = await this.appointmentRepository.save(appointment);

    // Release doctor back to available
    if (saved.doctorId) {
      await this.doctorRepository.updateStatus(saved.doctorId, "available");
      this.logger.log(
        `Doctor ${saved.doctorId} released to available after completing appointment ${appointmentId}`,
      );
    }

    this.logger.log(`Appointment ${appointmentId} completed successfully`);
  }
}
