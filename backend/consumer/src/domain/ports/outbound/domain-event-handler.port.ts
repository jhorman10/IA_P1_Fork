import { DomainEvent } from "../../events/domain-event.base";

/**
 * Port: Contract for handling a specific type of domain event.
 * ⚕️ HUMAN CHECK - OCP: Los nuevos tipos de evento requieren nuevos handlers, no modificar el bus.
 */
export interface DomainEventHandler<T extends DomainEvent = DomainEvent> {
  readonly eventType: string;
  handle(event: T): Promise<void>;
}
