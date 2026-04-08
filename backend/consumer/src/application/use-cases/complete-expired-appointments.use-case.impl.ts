import { CompleteExpiredAppointmentsUseCase } from "../../domain/ports/inbound/complete-expired-appointments.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../domain/ports/outbound/audit.port";
import { ClockPort } from "../../domain/ports/outbound/clock.port";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";

export class CompleteExpiredAppointmentsUseCaseImpl implements CompleteExpiredAppointmentsUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly notificationPort: NotificationPort,
    private readonly logger: LoggerPort,
    private readonly clock: ClockPort,
    // SPEC-003: Release doctor when appointment completes/expires
    private readonly doctorRepository: DoctorRepository,
    private readonly auditPort: AuditPort,
  ) {}

  async execute(): Promise<void> {
    const now = this.clock.now();
    const expired = await this.appointmentRepository.findExpiredCalled(now);

    for (const app of expired) {
      const doctorId = app.doctorId;

      app.complete();
      await this.appointmentRepository.save(app);
      await this.notificationPort.notifyAppointmentUpdated(app);

      // SPEC-003: Release doctor back to available after turno completes
      if (doctorId) {
        const doctor = await this.doctorRepository.findById(doctorId);
        if (doctor) {
          doctor.markAvailable();
          await this.doctorRepository.updateStatus(doctor.id, doctor.status);
          await this.auditPort.log({
            action: "APPOINTMENT_COMPLETED",
            appointmentId: app.id,
            doctorId: doctor.id,
            details: {
              patientIdCard: app.idCard.toValue(),
              patientName: app.fullName.toValue(),
              doctorName: doctor.name,
              office: doctor.office,
            },
            timestamp: now,
          });
        }
      }
    }

    if (expired.length > 0) {
      this.logger.log(
        `Completed ${expired.length} expired appointments`,
        "CompleteExpiredAppointmentsUseCase",
      );
    }
  }
}
