import { randomUUID } from "crypto";

import { ValidationError } from "../errors/validation.error";
import { DomainEvent } from "../events/domain-event.base";
import { FullName } from "../value-objects/full-name.value-object";
import { IdCard } from "../value-objects/id-card.value-object";
import { Priority } from "../value-objects/priority.value-object";

// Pattern: Entity — Domain object without infrastructure dependencies
// ⚕️ HUMAN CHECK - Entidad de dominio pura que posee con precisión su Identidad (H-24)

export type AppointmentStatus =
  | "waiting"
  | "called"
  | "completed"
  | "cancelled";

export class Appointment {
  private domainEvents: DomainEvent[] = [];

  constructor(
    public readonly idCard: IdCard,
    public readonly fullName: FullName,
    public readonly priority: Priority,
    public status: AppointmentStatus,
    public office: string | null = null,
    public timestamp: number = Date.now(),
    public completedAt?: number,
    public readonly id: string = randomUUID(), // 🎯 DOMAIN GENERATED IDENTITY
    // SPEC-003: médico asignado — null para turnos en espera o migrados
    public doctorId: string | null = null,
    public doctorName: string | null = null,
  ) {}

  public recordEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  public pullEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }

  public assignOffice(
    office: string,
    durationSeconds: number,
    now: number,
  ): void {
    if (this.status !== "waiting") {
      throw new ValidationError(
        `Cannot assign office to appointment in ${this.status} status`,
      );
    }
    this.status = "called";
    this.office = office;
    this.completedAt = now + durationSeconds * 1000;
  }

  /**
   * SPEC-003: Asigna un médico real al turno.
   * Persiste doctorId, doctorName y office del médico.
   */
  public assignDoctor(
    doctorId: string,
    doctorName: string,
    office: string,
    durationSeconds: number,
    now: number,
  ): void {
    if (this.status !== "waiting") {
      throw new ValidationError(
        `Cannot assign doctor to appointment in ${this.status} status`,
      );
    }
    this.status = "called";
    this.office = office;
    this.doctorId = doctorId;
    this.doctorName = doctorName;
    this.completedAt = now + durationSeconds * 1000;
  }

  public complete(): void {
    this.status = "completed";
  }

  public cancel(): void {
    this.status = "cancelled";
  }
}
