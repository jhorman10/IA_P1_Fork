import { DoctorStatus } from "../../schemas/doctor.schema";
import { ValidationError } from "../errors/validation.error";

export { DoctorStatus };

/**
 * Pattern: Entity — Domain object without infrastructure dependencies.
 * SPEC-003: Médico registrado con disponibilidad y consultorio.
 */
export class Doctor {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly specialty: string,
    public office: string | null,
    public status: DoctorStatus,
  ) {}

  /**
   * Médico llega a su consultorio → pasa a `available`.
   * Regla: no puede hacer check-in si ya está `available`.
   */
  public checkIn(): void {
    if (this.status === "available") {
      throw new ValidationError("Doctor is already available");
    }
    this.status = "available";
  }

  /**
   * Médico se retira → pasa a `offline`.
   * Regla: no puede hacer check-out si tiene paciente asignado (`busy`).
   */
  public checkOut(): void {
    if (this.status === "busy") {
      throw new ValidationError(
        "Doctor cannot check out while attending a patient",
      );
    }
    this.status = "offline";
  }

  /**
   * Se asigna un paciente al médico → pasa a `busy`.
   * Regla: solo médicos `available` pueden recibir pacientes.
   */
  public markBusy(): void {
    if (this.status !== "available") {
      throw new ValidationError(
        `Cannot assign patient to doctor with status '${this.status}'`,
      );
    }
    this.status = "busy";
  }

  /**
   * Turno finalizado o expirado → médico vuelve a `available`.
   */
  public markAvailable(): void {
    this.status = "available";
  }
}
