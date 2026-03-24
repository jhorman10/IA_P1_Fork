import { DomainEvent } from "../../../src/domain/events/domain-event.base";

/** Constructor signature for DomainEvent subclasses */
type DomainEventConstructor = new (...args: unknown[]) => DomainEvent;

/**
 * MockEventBroadcaster: Simulates EventBroadcasterPort for testing event emission.
 */
export class MockEventBroadcaster {
  broadcastCalls: DomainEvent[] = [];
  throwOnBroadcast = false;

  async broadcast(event: DomainEvent): Promise<void> {
    if (this.throwOnBroadcast) {
      throw new Error("Broadcast failed");
    }
    this.broadcastCalls.push(event);
  }

  getLastBroadcast(): DomainEvent | null {
    if (this.broadcastCalls.length === 0) {
      return null;
    }
    return this.broadcastCalls[this.broadcastCalls.length - 1];
  }

  getBroadcastsByType(
    eventType: string | DomainEventConstructor,
  ): DomainEvent[] {
    return this.broadcastCalls.filter((event) => {
      if (typeof eventType === "string") {
        return event.constructor.name === eventType;
      }
      return event instanceof eventType;
    });
  }

  setThrowOnBroadcast(shouldThrow: boolean) {
    this.throwOnBroadcast = shouldThrow;
  }

  reset() {
    this.broadcastCalls = [];
    this.throwOnBroadcast = false;
  }
}
