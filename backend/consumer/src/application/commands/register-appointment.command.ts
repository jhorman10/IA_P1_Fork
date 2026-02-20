/**
 * ⚕️ HUMAN CHECK - Comando de Aplicación
 * Desacopla el Caso de Uso de los DTOs de la API/Infraestructura.
 */
export class RegisterAppointmentCommand {
    constructor(
        public readonly idCard: number,
        public readonly fullName: string,
        public readonly priority?: string
    ) { }
}
