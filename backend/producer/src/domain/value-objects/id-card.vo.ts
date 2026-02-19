export class IdCard {
    private readonly value: number;

    constructor(value: number) {
        this.validate(value);
        this.value = value;
    }

    private validate(value: number): void {
        if (!Number.isInteger(value)) {
            throw new Error('IdCard must be an integer');
        }
        if (value <= 0) {
            throw new Error('IdCard must be a positive number');
        }
        // Basic length check (e.g. Colombian ID usually 6-10 digits)
        if (value.toString().length < 6 || value.toString().length > 12) {
            throw new Error('IdCard must be between 6 and 12 digits');
        }
    }

    get Value(): number {
        return this.value;
    }

    toString(): string {
        return this.value.toString();
    }
}
