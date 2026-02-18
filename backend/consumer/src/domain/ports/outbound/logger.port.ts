/**
 * ⚕️ HUMAN CHECK - Logger Port: Diagnostic logging contract for the Domain/Application.
 * Allows core logic to log without coupling to a specific framework (NestJS, Winston, etc.).
 */
export interface LoggerPort {
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
}
