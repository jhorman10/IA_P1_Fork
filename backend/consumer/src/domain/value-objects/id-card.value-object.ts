import { ValidationError } from '../errors/validation.error';

/**
 * Pattern: Value Object
 * Encapsulates the patient's identity (idCard) to ensure domain-level validation.
 */
export class IdCard {
    private readonly value: number;

    constructor(idCard: number | string) {
        const numericValue = Number(idCard);

        if (Number.isNaN(numericValue) || numericValue <= 0) {
            throw new ValidationError(
                `Invalid IdCard: ${idCard}. Must be a positive number.`,
                'INVALID_IDCARD_FORMAT',
                { idCard }
            );
        }

        this.value = numericValue;
    }

    /**
     * Returns the primitive value for persistence or logging.
     */
    public toValue(): number {
        return this.value;
    }

    /**
     * Equality check between two Value Objects.
     */
    public equals(other: IdCard): boolean {
        return this.value === other.toValue();
    }

    public toString(): string {
        return String(this.value);
    }
}
