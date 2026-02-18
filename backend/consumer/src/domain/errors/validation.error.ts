export class ValidationError extends Error {
    constructor(
        public readonly message: string,
        public readonly code: string = 'DOMAIN_VALIDATION_ERROR',
        public readonly context?: Record<string, any>
    ) {
        super(message);
        this.name = 'ValidationError';
    }
}
