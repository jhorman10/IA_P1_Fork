import { IdCard } from '../value-objects/id-card.value-object';
import { DomainEvent } from '../events/domain-event.base';

// Pattern: Entity — Domain object without infrastructure dependencies
// ⚕️ HUMAN CHECK - Pure domain entity

export type AppointmentStatus = 'waiting' | 'called' | 'completed';
export type AppointmentPriority = 'high' | 'medium' | 'low';

export class Appointment {
    private domainEvents: DomainEvent[] = [];

    constructor(
        public readonly id: string,
        public readonly idCard: IdCard,
        public readonly fullName: string,
        public readonly priority: AppointmentPriority,
        public status: AppointmentStatus,
        public office: string | null = null,
        public timestamp: number = Date.now(),
        public completedAt?: number,
    ) { }

    public recordEvent(event: DomainEvent): void {
        this.domainEvents.push(event);
    }

    public pullEvents(): DomainEvent[] {
        const events = [...this.domainEvents];
        this.domainEvents = [];
        return events;
    }

    public assignOffice(office: string, durationSeconds: number, now: number): void {
        if (this.status !== 'waiting') {
            throw new Error(`Cannot assign office to appointment in ${this.status} status`);
        }
        this.status = 'called';
        this.office = office;
        this.completedAt = now + (durationSeconds * 1000);
    }

    public complete(): void {
        this.status = 'completed';
    }
}
