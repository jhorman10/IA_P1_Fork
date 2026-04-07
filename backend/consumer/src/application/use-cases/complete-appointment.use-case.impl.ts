import { CompleteAppointmentUseCase } from "../../domain/ports/inbound/complete-appointment.use-case";
import { AssignAvailableOfficesUseCase } from "../../domain/ports/inbound/assign-available-offices.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../domain/ports/outbound/audit.port";
import { ClockPort } from "../../domain/ports/outbound/clock.port";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";

// ⚕️ HUMAN CHECK - SPEC-012: Explicit completion mirrors CompleteExpiredAppointmentsUseCase
// but operates on a single appointment by ID, then triggers assignment immediately.

export class CompleteAppointmentUseCaseImpl implements CompleteAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly doctorRepository: DoctorRepository,
    private readonly notificationPort: NotificationPort,
    private readonly auditPort: AuditPort,
    private readonly clock: ClockPort,
    private readonly logger: LoggerPort,
    private readonly assignUseCase: AssignAvailableOfficesUseCase,
  ) {}

  async execute(appointmentId: string): Promise<void> {
    const appointment =
      await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      this.logger.log(
        `[CompleteAppointment] Appointment ${appointmentId} not found — skipping`,
        "CompleteAppointmentUseCase",
      );
      return;
    }

    if (appointment.status !== "called") {
      this.logger.log(
        `[CompleteAppointment] Appointment ${appointmentId} is ${appointment.status} — skipping`,
        "CompleteAppointmentUseCase",
      );
      return;
    }

    const doctorId = appointment.doctorId;

    appointment.complete();
    await this.appointmentRepository.save(appointment);
    await this.notificationPort.notifyAppointmentUpdated(appointment);

    // Release doctor back to available
    if (doctorId) {
      const doctor = await this.doctorRepository.findById(doctorId);
      if (doctor) {
        doctor.markAvailable();
        await this.doctorRepository.updateStatus(doctor.id, doctor.status);
        await this.auditPort.log({
          action: "APPOINTMENT_COMPLETED",
          appointmentId: appointment.id,
          doctorId: doctor.id,
          details: {
            patientIdCard: appointment.idCard.toValue(),
            patientName: appointment.fullName.toValue(),
            doctorName: doctor.name,
            office: doctor.office,
          },
          timestamp: this.clock.now(),
        });
      }
    }

    this.logger.log(
      `[CompleteAppointment] Appointment ${appointmentId} completed explicitly`,
      "CompleteAppointmentUseCase",
    );

    // Trigger immediate assignment so next waiting patient is served
    await this.assignUseCase.execute();
  }
}
