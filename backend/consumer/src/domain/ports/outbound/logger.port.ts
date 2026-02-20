/**
 * ⚕️ HUMAN CHECK - Puerto Logger: Contrato de logging diagnóstico para el Dominio/Aplicación.
 * Permite registrar eventos sin acoplarse a un framework específico (NestJS, Winston, etc.).
 */
export interface LoggerPort {
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
}
