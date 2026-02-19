export class PatientName {
    private readonly value: string;

    constructor(value: string) {
        this.validate(value);
        this.value = value.trim();
    }

    private validate(value: string): void {
        if (!value || value.trim().length === 0) {
            throw new Error('PatientName cannot be empty');
        }
        if (value.trim().length < 3) {
            throw new Error('PatientName must be at least 3 characters long');
        }
        const regex = /^[a-zA-ZñÑáéíóúÁÉÍÓÚ\s]+$/;
        if (!regex.test(value)) {
            throw new Error('PatientName contains invalid characters');
        }
    }

    get Value(): string {
        return this.value;
    }

    toString(): string {
        return this.value;
    }
}
