import { Appointment } from "../entities/appointment.entity";

/**
 * Domain Policy: Encapsulates rules for office consultation management.
 * Pure domain logic — no infrastructure/framework dependencies.
 *
 * ⚕️ HUMAN CHECK - H-33: Eliminado @Injectable (dominio no debe conocer NestJS)
 * SRP: Una sola razón para cambiar (reglas de negocio para consulta)
 * Pattern: Policy Pattern (encapsula reglas de negocio variables)
 * Reference: DDD Tactic — Domain Services for cross-aggregate operations
 */
export class ConsultationPolicy {
  private static readonly MIN_DURATION_SECONDS = 8;
  private static readonly MAX_DURATION_SECONDS = 15;

  constructor(private readonly randomFn: () => number = Math.random) {}

  /**
   * Determine which offices are available for new appointments.
   *
   * @param allOfficeIds - Complete list of office identifiers
   * @param occupiedAppointments - Appointments currently using offices (status='called')
   * @returns Array of office IDs that are free
   *
   * ⚕️ HUMAN CHECK - Esta lógica estaba previamente en el Repositorio (corrección A-08).
   * Extraída al dominio para satisfacer SRP: Repositorio = persistencia,
   * Policy = lógica de negocio (qué hace que una oficina esté "disponible").
   */
  findAvailableOffices(
    allOfficeIds: string[],
    occupiedAppointments: Appointment[],
  ): string[] {
    const occupiedOffices = new Set(
      occupiedAppointments
        .filter((a) => a.status === "called" && a.office)
        .map((a) => a.office as string),
    );

    return allOfficeIds.filter((id) => !occupiedOffices.has(id));
  }

  /**
   * Determine if appointment can be assigned to an office.
   *
   * Business rule: Can only assign if status is 'waiting' and no office yet assigned.
   */
  canAssign(appointment: Appointment): boolean {
    return appointment.status === "waiting" && !appointment.office;
  }

  /**
   * Validate office assignment eligibility.
   *
   * @param office - Office identifier to assign
   * @param availableOffices - List of currently available offices
   * @returns true if office is available and valid
   */
  isOfficeEligible(office: string, availableOffices: string[]): boolean {
    return availableOffices.includes(office) && office.length > 0;
  }

  /**
   * Calculates a random duration for a medical consultation based on clinic policies.
   * The RNG function is injectable for deterministic tests.
   */
  public getRandomDurationSeconds(): number {
    return (
      Math.floor(
        this.randomFn() *
          (ConsultationPolicy.MAX_DURATION_SECONDS -
            ConsultationPolicy.MIN_DURATION_SECONDS +
            1),
      ) + ConsultationPolicy.MIN_DURATION_SECONDS
    );
  }

  /**
   * Static convenience method for production use (default Math.random).
   */
  public static getRandomDurationSeconds(): number {
    return new ConsultationPolicy().getRandomDurationSeconds();
  }
}
