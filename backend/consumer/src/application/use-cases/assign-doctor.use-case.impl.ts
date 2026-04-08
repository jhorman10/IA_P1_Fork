import { AppointmentAssignedEvent } from "../../domain/events/appointment-assigned.event";
import { ConsultationPolicy } from "../../domain/policies/consultation.policy";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../domain/ports/outbound/audit.port";
import { ClockPort } from "../../domain/ports/outbound/clock.port";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";

export class AssignDoctorUseCaseImpl {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly doctorRepository: DoctorRepository,
    private readonly auditPort: AuditPort,
    private readonly logger: LoggerPort,
    private readonly clock: ClockPort,
    private readonly consultationPolicy: ConsultationPolicy,
  ) {}

  async execute(): Promise<void> {
    this.logger.log("--- INICIO ASIGNACIÓN DE MÉDICO ---");

    const availableDoctors = await this.doctorRepository.findAvailable();
    if (availableDoctors.length === 0) {
      this.logger.log("No hay médicos disponibles para asignar");
      return;
    }

    let waiting = await this.appointmentRepository.findWaiting();
    if (waiting.length === 0) {
      this.logger.log("No hay turnos en espera para asignar");
      return;
    }

    // Sort by priority then FIFO
    waiting = waiting.sort((a, b) => {
      const priorityDiff =
        a.priority.getNumericWeight() - b.priority.getNumericWeight();
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    const assignments = Math.min(availableDoctors.length, waiting.length);

    for (let i = 0; i < assignments; i++) {
      const appointment = waiting[i];
      const doctor = availableDoctors[i];

      const durationSeconds =
        this.consultationPolicy.getRandomDurationSeconds();
      const now = this.clock.now();

      appointment.assignDoctor(
        doctor.id,
        doctor.name,
        // doctor.office is guaranteed non-null for status "available" (SPEC-015 invariant)
        doctor.office!,
        durationSeconds,
        now,
      );

      appointment.recordEvent(new AppointmentAssignedEvent(appointment));
      await this.appointmentRepository.save(appointment);

      doctor.markBusy?.();
      await this.doctorRepository.updateStatus(doctor.id, doctor.status);

      this.auditPort.log?.({
        action: "APPOINTMENT_ASSIGNED",
        appointmentId: appointment.id,
        doctorId: doctor.id,
        timestamp: this.clock.now(),
        details: {
          patientIdCard: appointment.idCard.toValue(),
          patientName: appointment.fullName.toValue(),
          doctorName: doctor.name,
          office: appointment.office,
          priority: appointment.priority.toValue(),
          queuePosition: i + 1,
        },
      });
    }

    this.logger.log("--- FIN ASIGNACIÓN DE MÉDICO ---");
  }
}
