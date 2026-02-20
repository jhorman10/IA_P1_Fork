import { DomainError } from './domain.error';

/**
 * Specifically for Data/Input validation failures.
 * Fatal: Should NOT be retried (leads to DLQ).
 */
export class ValidationError extends DomainError {
    constructor(message: string, code: string = 'VALIDATION_ERROR', context?: Record<string, unknown>) {
        super(message, code, context);
    }
}
