/**
 * Base class for all Domain Events.
 * Domain events represent something that happened in the past within the domain.
 */
export abstract class DomainEvent {
    public readonly occurredOn: number;
    public readonly eventId: string;

    constructor() {
        this.occurredOn = Date.now();
        this.eventId = Math.random().toString(36).substring(2, 15);
    }
}
