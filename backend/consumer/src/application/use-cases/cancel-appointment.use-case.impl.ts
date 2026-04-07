import { CancelAppointmentUseCase } from "../../domain/ports/inbound/cancel-appointment.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../domain/ports/outbound/audit.port";
import { ClockPort } from "../../domain/ports/outbound/clock.port";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";

// ⚕️ HUMAN CHECK - SPEC-012: Cancel only waiting appointments (no doctor assigned yet).
// Does NOT release any doctor — cancelling waiting appointments has no doctor context.

export class CancelAppointmentUseCaseImpl implements CancelAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly notificationPort: NotificationPort,
    private readonly auditPort: AuditPort,
    private readonly clock: ClockPort,
    private readonly logger: LoggerPort,
  ) {}

  async execute(appointmentId: string): Promise<void> {
    const appointment =
      await this.appointmentRepository.findById(appointmentId);
    if (!appointment) {
      this.logger.log(
        `[CancelAppointment] Appointment ${appointmentId} not found — skipping`,
        "CancelAppointmentUseCase",
      );
      return;
    }

    if (appointment.status !== "waiting") {
      this.logger.log(
        `[CancelAppointment] Appointment ${appointmentId} is ${appointment.status} — skipping`,
        "CancelAppointmentUseCase",
      );
      return;
    }

    appointment.cancel();
    await this.appointmentRepository.save(appointment);
    await this.notificationPort.notifyAppointmentUpdated(appointment);

    await this.auditPort.log({
      action: "APPOINTMENT_CANCELLED",
      appointmentId: appointment.id,
      doctorId: null,
      details: {
        patientIdCard: appointment.idCard.toValue(),
        patientName: appointment.fullName.toValue(),
      },
      timestamp: this.clock.now(),
    });

    this.logger.log(
      `[CancelAppointment] Appointment ${appointmentId} cancelled`,
      "CancelAppointmentUseCase",
    );
  }
}
