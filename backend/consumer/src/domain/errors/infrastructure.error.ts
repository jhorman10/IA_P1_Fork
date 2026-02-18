/**
 * Specifically for transient technical failures.
 * Policiy: Should be retried.
 */
export class InfrastructureError extends Error {
    constructor(
        public readonly message: string,
        public readonly originalError?: any
    ) {
        super(message);
        this.name = 'InfrastructureError';
    }
}
