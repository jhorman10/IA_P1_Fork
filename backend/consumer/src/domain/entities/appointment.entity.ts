// Pattern: Entity — Domain object without infrastructure dependencies
// ⚕️ HUMAN CHECK - Pure domain entity

export type AppointmentStatus = 'waiting' | 'called' | 'completed';
export type AppointmentPriority = 'high' | 'medium' | 'low';

export class Appointment {
    constructor(
        public readonly id: string,
        public readonly idCard: number,
        public readonly fullName: string,
        public readonly priority: AppointmentPriority,
        public status: AppointmentStatus,
        public office: string | null = null,
        public timestamp: number = Date.now(),
        public completedAt?: number,
    ) { }

    public assignOffice(office: string, durationSeconds: number, now: number): void {
        if (this.status !== 'waiting') {
            throw new Error(`Cannot assign office to appointment in ${this.status} status`);
        }
        this.office = office;
        this.status = 'called';
        this.completedAt = now + durationSeconds * 1000;
    }

    public complete(): void {
        this.status = 'completed';
    }
}
