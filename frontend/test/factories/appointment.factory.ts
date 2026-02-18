export interface MockAppointment {
    idCard: number;
    fullName: string;
    priority: 'low' | 'medium' | 'high';
}

export class AppointmentFactory {
    static create(overrides: Partial<MockAppointment> = {}): MockAppointment {
        return {
            idCard: 12345678,
            fullName: 'Test Patient',
            priority: 'medium',
            ...overrides,
        };
    }

    static createMany(count: number, overrides: Partial<MockAppointment> = {}): MockAppointment[] {
        return Array.from({ length: count }, () => this.create(overrides));
    }
}
