import { AppointmentAssignedEvent } from "../../domain/events/appointment-assigned.event";
import { ConsultationPolicy } from "../../domain/policies/consultation.policy";
import { AssignAvailableOfficesUseCase } from "../../domain/ports/inbound/assign-available-offices.use-case";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../domain/ports/outbound/audit.port";
import { ClockPort } from "../../domain/ports/outbound/clock.port";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";

/**
 * SPEC-003: Doctor-based assignment use case.
 * Replaces the office-numeric model with real doctor availability.
 *
 * Invariants:
 * - Only doctors with status=available receive patients.
 * - After assignment, doctor transitions to busy.
 * - Each assignment is recorded in the audit log.
 * - Waiting queue is sorted: priority (high→low) then FIFO timestamp.
 */
export class AssignDoctorUseCaseImpl implements AssignAvailableOfficesUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly doctorRepository: DoctorRepository,
    private readonly auditPort: AuditPort,
    private readonly logger: LoggerPort,
    private readonly clock: ClockPort,
    private readonly consultationPolicy: ConsultationPolicy,
  ) {}

  async execute(): Promise<void> {
    this.logger.log(
      "--- INICIO ASIGNACIÓN POR MÉDICO ---",
      "AssignDoctorUseCase",
    );

    const availableDoctors = await this.doctorRepository.findAvailable();
    this.logger.log(
      `Médicos disponibles: ${availableDoctors.map((d) => d.name).join(", ") || "ninguno"}`,
      "AssignDoctorUseCase",
    );

    if (availableDoctors.length === 0) {
      this.logger.log(
        "No hay médicos disponibles para asignar.",
        "AssignDoctorUseCase",
      );
      return;
    }

    let waiting = await this.appointmentRepository.findWaiting();
    this.logger.log(
      `Turnos en espera: ${waiting.map((a) => a.idCard.toValue()).join(", ") || "ninguno"}`,
      "AssignDoctorUseCase",
    );

    if (waiting.length === 0) {
      this.logger.log(
        "No hay turnos en espera para asignar.",
        "AssignDoctorUseCase",
      );
      return;
    }

    // Sort: priority weight ASC (high=1 < medium=2 < low=3), then FIFO
    waiting = waiting.sort((a, b) => {
      const priorityDiff =
        a.priority.getNumericWeight() - b.priority.getNumericWeight();
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    const possibleAssignments = Math.min(
      availableDoctors.length,
      waiting.length,
    );
    this.logger.log(
      `Asignaciones posibles: ${possibleAssignments}`,
      "AssignDoctorUseCase",
    );

    // Compute queue positions before assignment for audit context
    const queuePositionMap = new Map<string, number>();
    waiting.forEach((appt, index) => {
      queuePositionMap.set(appt.id, index + 1);
    });

    for (let i = 0; i < possibleAssignments; i++) {
      const appointment = waiting[i];
      const doctor = availableDoctors[i];
      const now = this.clock.now();
      const durationSeconds =
        this.consultationPolicy.getRandomDurationSeconds();

      this.logger.log(
        `Asignando Dr. ${doctor.name} (office ${doctor.office}) a turno ${appointment.idCard.toValue()} ` +
          `(prioridad: ${appointment.priority.toValue()}, duración: ${durationSeconds}s)`,
        "AssignDoctorUseCase",
      );

      // Domain: assign doctor info + transition to called
      appointment.assignDoctor(
        doctor.id,
        doctor.name,
        doctor.office,
        durationSeconds,
        now,
      );
      appointment.recordEvent(new AppointmentAssignedEvent(appointment));

      // Persist appointment
      await this.appointmentRepository.save(appointment);

      // Persist doctor status change: available → busy
      doctor.markBusy();
      await this.doctorRepository.updateStatus(doctor.id, doctor.status);

      // Audit: APPOINTMENT_ASSIGNED
      await this.auditPort.log({
        action: "APPOINTMENT_ASSIGNED",
        appointmentId: appointment.id,
        doctorId: doctor.id,
        details: {
          patientIdCard: appointment.idCard.toValue(),
          patientName: appointment.fullName.toValue(),
          doctorName: doctor.name,
          office: doctor.office,
          priority: appointment.priority.toValue(),
          queuePosition: queuePositionMap.get(appointment.id) ?? undefined,
        },
        timestamp: now,
      });

      this.logger.log(
        `Assigned Dr. ${doctor.name} to appointment ${appointment.id}`,
        "AssignDoctorUseCase",
      );
    }

    this.logger.log("--- FIN ASIGNACIÓN POR MÉDICO ---", "AssignDoctorUseCase");
  }
}
