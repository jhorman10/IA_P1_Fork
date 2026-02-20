import { LocalDomainEventBusAdapter } from '../../../../src/infrastructure/messaging/local-domain-event-bus.adapter';
import { DomainEvent } from '../../../../src/domain/events/domain-event.base';
import { DomainEventHandler } from '../../../../src/domain/ports/outbound/domain-event-handler.port';

/**
 * ⚕️ HUMAN CHECK - Verificación OCP:
 * Testea el despacho basado en registro. Sin cadenas instanceof.
 * Los nuevos tipos de evento deberían funcionar registrando nuevos handlers, sin modificar el bus.
 */

class FakeEventA extends DomainEvent {
    constructor() { super(); }
}

class FakeEventB extends DomainEvent {
    constructor() { super(); }
}

class UnregisteredEvent extends DomainEvent {
    constructor() { super(); }
}

describe('LocalDomainEventBusAdapter (Registry Pattern)', () => {
    let handlerA: jest.Mocked<DomainEventHandler<FakeEventA>>;
    let handlerB: jest.Mocked<DomainEventHandler<FakeEventB>>;

    beforeEach(() => {
        handlerA = {
            eventType: 'FakeEventA',
            handle: jest.fn().mockResolvedValue(undefined),
        };
        handlerB = {
            eventType: 'FakeEventB',
            handle: jest.fn().mockResolvedValue(undefined),
        };
    });

    it('should dispatch event to the correct handler', async () => {
        const bus = new LocalDomainEventBusAdapter([handlerA, handlerB]);
        const eventA = new FakeEventA();

        await bus.publish(eventA);

        expect(handlerA.handle).toHaveBeenCalledWith(eventA);
        expect(handlerB.handle).not.toHaveBeenCalled();
    });

    it('should dispatch to multiple handlers for the same event type', async () => {
        const secondHandlerA: jest.Mocked<DomainEventHandler<FakeEventA>> = {
            eventType: 'FakeEventA',
            handle: jest.fn().mockResolvedValue(undefined),
        };
        const bus = new LocalDomainEventBusAdapter([handlerA, secondHandlerA]);
        const eventA = new FakeEventA();

        await bus.publish(eventA);

        expect(handlerA.handle).toHaveBeenCalledWith(eventA);
        expect(secondHandlerA.handle).toHaveBeenCalledWith(eventA);
    });

    it('should publish an array of events in order', async () => {
        const bus = new LocalDomainEventBusAdapter([handlerA, handlerB]);
        const eventA = new FakeEventA();
        const eventB = new FakeEventB();

        await bus.publish([eventA, eventB]);

        expect(handlerA.handle).toHaveBeenCalledWith(eventA);
        expect(handlerB.handle).toHaveBeenCalledWith(eventB);

        // Verify order
        const orderA = handlerA.handle.mock.invocationCallOrder[0];
        const orderB = handlerB.handle.mock.invocationCallOrder[0];
        expect(orderA).toBeLessThan(orderB);
    });

    it('should warn but not throw for unregistered event types', async () => {
        const bus = new LocalDomainEventBusAdapter([handlerA]);
        const unregistered = new UnregisteredEvent();

        // Should not throw
        await expect(bus.publish(unregistered)).resolves.toBeUndefined();
        expect(handlerA.handle).not.toHaveBeenCalled();
    });

    it('should handle empty handler list gracefully', async () => {
        const bus = new LocalDomainEventBusAdapter([]);
        const eventA = new FakeEventA();

        await expect(bus.publish(eventA)).resolves.toBeUndefined();
    });
});
