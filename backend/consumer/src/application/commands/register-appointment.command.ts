/**
 * ⚕️ HUMAN CHECK - Application Command
 * Decouples Use Case from API/Infrastructure DTOs.
 */
export class RegisterAppointmentCommand {
    constructor(
        public readonly idCard: number,
        public readonly fullName: string,
        public readonly priority?: string
    ) { }
}
