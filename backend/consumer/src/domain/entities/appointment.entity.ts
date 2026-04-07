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
  public doctorId: string | null;
  public timestamp: number;
  public completedAt?: number;
  public readonly id: string;

  // Backwards-compatible constructor: older call-sites passed (office, timestamp, completedAt)
  // while newer signature includes doctorId before timestamp. To avoid breaking tests,
  // we accept a flexible 6th parameter and normalize inside.
  constructor(
    public readonly idCard: IdCard,
    public readonly fullName: FullName,
    public readonly priority: Priority,
    public status: AppointmentStatus,
    public office: string | null = null,
    // Can be either doctorId (string|null) in the new API, or timestamp (number) in older calls
    _doctorIdOrTimestamp: string | null | number | undefined = null,
    // When _doctorIdOrTimestamp is doctorId, this is the timestamp; otherwise it's the completedAt
    _timestampOrCompletedAt?: number,
    _completedAtOrId?: number | string,
    // Optional final id parameter (keeps backwards compatibility with 8-arg older ctor)
    _maybeId?: string,
  ) {
    // Normalize parameters
    let resolvedDoctorId: string | null = null;
    let resolvedTimestamp: number = Date.now();
    let resolvedCompletedAt: number | undefined = undefined;

    if (typeof _doctorIdOrTimestamp === "number") {
      // Old signature: (office, timestamp, completedAt)
      resolvedTimestamp = _doctorIdOrTimestamp;
      if (typeof _timestampOrCompletedAt === "number") {
        resolvedCompletedAt = _timestampOrCompletedAt;
      }
      // Older callers passed `id` as the 8th argument
      if (typeof _completedAtOrId === "string") {
        this.id = _completedAtOrId;
      } else if (typeof _maybeId === "string") {
        this.id = _maybeId;
      } else {
        this.id = randomUUID();
      }
    } else {
      // New signature: (office, doctorId, timestamp, completedAt)
      resolvedDoctorId = (_doctorIdOrTimestamp as string | null) ?? null;
      if (typeof _timestampOrCompletedAt === "number") {
        resolvedTimestamp = _timestampOrCompletedAt;
      }
      if (typeof _completedAtOrId === "number") {
        resolvedCompletedAt = _completedAtOrId;
      }
      // New callers may pass id as the final optional param
      if (typeof _maybeId === "string") {
        this.id = _maybeId;
      } else {
        this.id = randomUUID();
      }
    }

    this.doctorId = resolvedDoctorId;
    this.timestamp = resolvedTimestamp;
    this.completedAt = resolvedCompletedAt;
  }

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

  public assignDoctor(
    doctorId: string,
    _doctorName: string,
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
    this.completedAt = now + durationSeconds * 1000;
  }

  public complete(): void {
    this.status = "completed";
  }

  public cancel(): void {
    this.status = "cancelled";
  }
}
