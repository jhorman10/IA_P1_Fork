import { AppointmentRegisteredEvent } from "../../domain/events/appointment-registered.event";
import { AppointmentAssignedEvent } from "../../domain/events/appointment-assigned.event";
import { DomainEventHandler } from "../../domain/ports/outbound/domain-event-handler.port";
import { AppointmentRepository } from "../../domain/ports/outbound/appointment.repository";
import { DoctorRepository } from "../../domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { ClockPort } from "../../domain/ports/outbound/clock.port";
import { ConsultationPolicy } from "../../domain/policies/consultation.policy";

/**
 * Handler: When an appointment is registered, attempt a minimal doctor assignment.
 * - Picks first available doctor and next waiting appointment by priority/FIFO
 * - Marks appointment as called and doctor as busy
 */
export class AutoAssignOnRegisterHandler implements DomainEventHandler<AppointmentRegisteredEvent> {
  readonly eventType = AppointmentRegisteredEvent.name;

  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly doctorRepository: DoctorRepository,
    private readonly logger: LoggerPort,
    private readonly clock: ClockPort,
    private readonly consultationPolicy: ConsultationPolicy,
  ) {}

  async handle(_: AppointmentRegisteredEvent): Promise<void> {
    this.logger.log("AutoAssignOnRegisterHandler triggered");

    const availableDoctors = await this.doctorRepository.findAvailable();
    if (availableDoctors.length === 0) {
      this.logger.log("No available doctors to assign");
      return;
    }

    let waiting = await this.appointmentRepository.findWaiting();
    if (waiting.length === 0) {
      this.logger.log("No waiting appointments to assign");
      return;
    }

    // Sort: priority weight ASC (high < medium < low), then FIFO
    waiting = waiting.sort((a, b) => {
      const priorityDiff =
        a.priority.getNumericWeight() - b.priority.getNumericWeight();
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    const appointment = waiting[0];
    const doctor = availableDoctors[0];
    const now = this.clock.now();
    const durationSeconds = this.consultationPolicy.getRandomDurationSeconds();

    this.logger.log(
      `Assigning Dr ${doctor.name} to patient ${appointment.idCard.toValue()}`,
    );

    // Domain update
    try {
      appointment.assignDoctor(
        doctor.id,
        doctor.name,
        doctor.office,
        durationSeconds,
        now,
      );
      appointment.recordEvent(new AppointmentAssignedEvent(appointment));
      await this.appointmentRepository.save(appointment);

      // Persist doctor status change
      doctor.markBusy();
      await this.doctorRepository.updateStatus(doctor.id, doctor.status);

      this.logger.log(
        `Assigned doctor ${doctor.name} to appointment ${appointment.id}`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Auto-assign failed: ${message}`);
    }
  }
}
