/**
 * ⚕️ HUMAN CHECK - Domain Error Base
 * Distinguishes business logic violations from technical failures.
 */
export abstract class DomainError extends Error {
    constructor(
        message: string,
        public readonly code: string = 'DOMAIN_ERROR',
        public readonly context?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
