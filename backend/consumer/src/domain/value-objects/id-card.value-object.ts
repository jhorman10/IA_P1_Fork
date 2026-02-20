import { ValidationError } from '../errors/validation.error';
import { IdCard as IdCardBrand } from '../types/branded.types';

/**
 * Pattern: Value Object
 * Encapsulates the patient's identity (idCard) with branded type safety.
 * 
 * ⚕️ HUMAN CHECK - LSP: IdCard es SIEMPRE válido (el constructor lanza si es inválido).
 * El sistema de tipos previene mezcla accidental con otros números o strings.
 */
export class IdCard {
    private readonly value: IdCardBrand;

    constructor(idCard: number | string) {
        try {
            // Use branded type factory to validate and create IdCard
            // This ensures we never create an invalid IdCard state
            this.value = IdCardBrand.create(
                typeof idCard === 'string' ? parseInt(idCard, 10) : idCard
            );
        } catch (_error) {
            throw new ValidationError(
                `Invalid IdCard: ${idCard}. Must be a 6-12 digit number.`,
                'INVALID_IDCARD_FORMAT',
                { idCard }
            );
        }
    }

    /**
     * Returns the primitive value for persistence or logging.
     */
    public toValue(): number {
        return IdCardBrand.unbox(this.value);
    }

    /**
     * Equality check between two Value Objects.
     */
    public equals(other: IdCard): boolean {
        return this.value === other.value;
    }

    public toString(): string {
        return String(this.toValue());
    }

    /**
     * Safe deserialization from JSON.
     * Validates format and reconstructs proper IdCard instance.
     * 
     * @param json - Can be string or number
     * @returns New IdCard instance
     * @throws ValidationError if JSON is not a valid IdCard
     */
    public static fromJSON(json: unknown): IdCard {
        return new IdCard(IdCardBrand.parse(json).toString());
    }
}

