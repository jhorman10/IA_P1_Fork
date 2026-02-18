import { ValidationError } from '../errors/validation.error';

/**
 * Value Object: FullName
 * Represents a patient's full name with domain validation.
 */
export class FullName {
    private readonly value: string;

    constructor(value: string | undefined | null) {
        const trimmed = (value || '').trim();

        if (trimmed.length < 2) {
            throw new ValidationError(
                'Full name must be at least 2 characters long.',
                'INVALID_FULL_NAME',
                { value: trimmed }
            );
        }

        if (trimmed.length > 100) {
            throw new ValidationError(
                'Full name cannot exceed 100 characters.',
                'FULL_NAME_TOO_LONG',
                { value: trimmed }
            );
        }

        this.value = trimmed;
    }

    public toValue(): string {
        return this.value;
    }

    public equals(other: FullName): boolean {
        return this.value === other.value;
    }
}
