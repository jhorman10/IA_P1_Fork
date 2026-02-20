/* eslint-disable @typescript-eslint/no-namespace */
/**
 * Branded Types for Domain Value Object Safety
 * 
 * Pattern: Nominal typing to prevent accidental mixing of similar types
 * (e.g., IdCard vs Phone number, Priority enum vs arbitrary string)
 * 
 * Benefits:
 * ✅ Type-level safety (prevents string <-> number confusion at boundaries)
 * ✅ Self-documenting intent (a function expects IdCard, not just a number)
 * ✅ Prevents LSP violations (IdCard is ALWAYS valid or throws on construction)
 * ✅ Serialization-safe (no silent type coercion during JSON marshalling)
 * 
 * Reference: TypeScript Advanced Types
 * https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html#number-string-bool-any
 */

// Unique brand symbols for each value object
declare const __idCardBrand: unique symbol;
declare const __officeNumberBrand: unique symbol;
declare const __appointmentIdBrand: unique symbol;

/**
 * Branded Type: IdCard
 * 
 * Represents a validated Colombian ID card number (6-12 digits).
 * Cannot be accidentally mixed with other numbers.
 * 
 * @example
 * const id = IdCard.create(12345678);  // ✅ Valid IdCard
 * const id2 = IdCard.parse(json);      // ✅ Validated from JSON
 * 
 * // Function MUST receive IdCard, not just number
 * const apt = new Appointment(id, ...);
 */
export type IdCard = number & { readonly [__idCardBrand]: true };

/**
 * Branded Type: OfficeNumber
 * 
 * Represents a validated office identifier (non-empty string).
 * Cannot be accidentally mixed with regular strings.
 */
export type OfficeNumber = string & { readonly [__officeNumberBrand]: true };

/**
 * Branded Type: AppointmentId
 * 
 * Represents a unique appointment identifier (UUID).
 * Cannot be accidentally mixed with other strings.
 */
export type AppointmentId = string & { readonly [__appointmentIdBrand]: true };

/**
 * Factory namespace for IdCard: Safe construction and validation
 */
export namespace IdCard {
    /**
     * Create a branded IdCard from a number.
     * Throws if the number is invalid (outside 6-12 digit range).
     * 
     * ⚕️ HUMAN CHECK - LSP: Guarantees that result ALWAYS satisfies IdCard constraints
     */
    export function create(value: number): IdCard {
        if (!Number.isInteger(value) || value < 100000 || value > 999999999999) {
            throw new Error(
                `Invalid IdCard: must be integer between 6 and 12 digits, got ${value}`
            );
        }
        return value as IdCard;
    }

    /**
     * Parse a branded IdCard from JSON (string or number).
     * Safe deserialization with validation.
     */
    export function parse(json: unknown): IdCard {
        const num = Number(json);
        if (isNaN(num)) {
            throw new Error(`Invalid IdCard: cannot parse "${json}" as number`);
        }
        return create(num);
    }

    /**
     * Check if a value is a valid IdCard without building one.
     * Useful for conditional logic without exceptions.
     */
    export function isValid(value: unknown): value is IdCard {
        try {
            create(Number(value));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Extract the numeric value from branded IdCard.
     * Use this when you need to interact with non-typed code.
     */
    export function unbox(id: IdCard): number {
        return id as number;
    }
}

/**
 * Factory namespace for OfficeNumber: Safe construction
 */
export namespace OfficeNumber {
    /**
     * Create a branded OfficeNumber from a string.
     * Throws if the string is empty or invalid type.
     */
    export function create(value: string): OfficeNumber {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(
                `Invalid OfficeNumber: must be non-empty string, got "${value}"`
            );
        }
        return value as OfficeNumber;
    }

    /**
     * Check if a value is a valid OfficeNumber.
     */
    export function isValid(value: unknown): value is OfficeNumber {
        try {
            create(String(value));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Extract the string value from branded OfficeNumber.
     */
    export function unbox(office: OfficeNumber): string {
        return office as string;
    }
}

/**
 * Factory namespace for AppointmentId
 */
export namespace AppointmentId {
    /**
     * Create a branded AppointmentId from a UUID string.
     * Throws if not a valid UUID format.
     */
    export function create(value: string): AppointmentId {
        // Basic UUID v4 validation: 8-4-4-4-12 hex digits
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(value)) {
            throw new Error(
                `Invalid AppointmentId: must be valid UUIDv4, got "${value}"`
            );
        }
        return value as AppointmentId;
    }

    /**
     * Parse AppointmentId from JSON.
     */
    export function parse(json: unknown): AppointmentId {
        return create(String(json));
    }

    /**
     * Extract string value.
     */
    export function unbox(id: AppointmentId): string {
        return id as string;
    }
}
