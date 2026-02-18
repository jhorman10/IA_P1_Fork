/**
 * Base class for all Domain-related errors.
 * Used to distinguish business rule violations from technical failures.
 */
export abstract class DomainError extends Error {
    constructor(
        public readonly message: string,
        public readonly code: string = 'DOMAIN_ERROR',
        public readonly context?: Record<string, any>
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
