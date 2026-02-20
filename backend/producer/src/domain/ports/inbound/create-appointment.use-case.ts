/**
 * Command: Create Appointment
 * ⚕️ HUMAN CHECK - DIP: Objeto de dominio puro, desacoplado de los DTOs de la API.
 */
export interface CreateAppointmentCommand {
    idCard: number;
    fullName: string;
}

/**
 * Inbound Port: Create Appointment Use Case
 * ⚕️ HUMAN CHECK - Hexagonal: El Controller depende de esta interfaz.
 * Retorna void (lógica fire-and-forget).
 */
export interface CreateAppointmentUseCase {
    execute(command: CreateAppointmentCommand): Promise<void>;
}
