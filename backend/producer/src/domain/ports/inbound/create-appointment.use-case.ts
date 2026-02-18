/**
 * Command: Create Appointment
 * ⚕️ HUMAN CHECK - DIP: Pure domain object, decoupled from API DTOs.
 */
export interface CreateAppointmentCommand {
    idCard: number;
    fullName: string;
}

/**
 * Inbound Port: Create Appointment Use Case
 * ⚕️ HUMAN CHECK - Hexagonal: Controller depends on this interface.
 * Returns void (fire-and-forget logic).
 */
export interface CreateAppointmentUseCase {
    execute(command: CreateAppointmentCommand): Promise<void>;
}
