/**
 * ⚕️ HUMAN CHECK - Error de Dominio Base
 * Distingue violaciones de lógica de negocio de fallos técnicos.
 */
export abstract class DomainError extends Error {
    constructor(
        message: string,
        public readonly code: string = 'DOMAIN_ERROR',
        public readonly context?: Record<string, unknown>
    ) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
