import { Injectable, Logger } from "@nestjs/common";

import { DomainEvent } from "../../domain/events/domain-event.base";
import { DomainEventBus } from "../../domain/ports/outbound/domain-event-bus.port";
import { DomainEventHandler } from "../../domain/ports/outbound/domain-event-handler.port";

/**
 * Adapter: Infrastructure — Local implementation of the DomainEventBus.
 * ⚕️ HUMAN CHECK - OCP: Usa un registro de handlers. Agregar nuevos eventos requiere
 * registrar nuevos handlers, sin modificar esta clase.
 */
@Injectable()
export class LocalDomainEventBusAdapter implements DomainEventBus {
  private readonly logger = new Logger(LocalDomainEventBusAdapter.name);
  private readonly handlerMap = new Map<string, DomainEventHandler[]>();

  constructor(handlers: DomainEventHandler[]) {
    for (const handler of handlers) {
      const existing = this.handlerMap.get(handler.eventType) || [];
      existing.push(handler);
      this.handlerMap.set(handler.eventType, existing);
    }
    this.logger.log(
      `Registered ${handlers.length} event handler(s) for ${this.handlerMap.size} event type(s)`,
    );
  }

  async publish(events: DomainEvent | DomainEvent[]): Promise<void> {
    const eventArray = Array.isArray(events) ? events : [events];

    for (const event of eventArray) {
      this.logger.debug(
        `Publishing domain event: ${event.constructor.name} [ID: ${event.eventId}]`,
      );
      await this.dispatch(event);
    }
  }

  /**
   * Registry-based dispatch. No instanceof chains.
   */
  private async dispatch(event: DomainEvent): Promise<void> {
    const handlers = this.handlerMap.get(event.constructor.name) || [];

    if (handlers.length === 0) {
      this.logger.warn(
        `No handlers registered for event: ${event.constructor.name}`,
      );
      return;
    }

    for (const handler of handlers) {
      await handler.handle(event);
    }
  }
}
