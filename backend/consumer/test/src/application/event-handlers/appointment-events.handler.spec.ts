import { Test, TestingModule } from "@nestjs/testing";

import {
  AppointmentAssignedHandler,
  AppointmentRegisteredHandler,
} from "../../../../src/application/event-handlers/appointment-events.handler";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { AppointmentAssignedEvent } from "../../../../src/domain/events/appointment-assigned.event";
import { AppointmentRegisteredEvent } from "../../../../src/domain/events/appointment-registered.event";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";

/**
 * ⚕️ HUMAN CHECK - Handlers divididos: cada handler implementa DomainEventHandler<T>.
 * Los tests verifican handler individual + efecto secundario de notificación.
 */
describe("AppointmentEventsHandlers (Split OCP Handlers)", () => {
  interface NotificationPortMock {
    notifyAppointmentUpdated: jest.Mock<Promise<void>, [Appointment]>;
  }
  let mockNotificationPort: NotificationPortMock;
  const dummyAppointment = new Appointment(
    new IdCard(12345678),
    new FullName("John Doe"),
    new Priority("medium"),
    "waiting",
    null,
    Date.now(),
    undefined,
    "test-id",
  );

  beforeEach(() => {
    mockNotificationPort = {
      notifyAppointmentUpdated: jest.fn().mockResolvedValue(undefined),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("AppointmentRegisteredHandler", () => {
    let handler: AppointmentRegisteredHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentRegisteredHandler,
          { provide: "NotificationPort", useValue: mockNotificationPort },
        ],
      }).compile();

      handler = module.get<AppointmentRegisteredHandler>(
        AppointmentRegisteredHandler,
      );
    });

    it("should have the correct eventType", () => {
      expect(handler.eventType).toBe("AppointmentRegisteredEvent");
    });

    it("should notify on AppointmentRegisteredEvent", async () => {
      const event = new AppointmentRegisteredEvent(dummyAppointment);

      await handler.handle(event);

      expect(
        mockNotificationPort.notifyAppointmentUpdated,
      ).toHaveBeenCalledWith(dummyAppointment);
    });
  });

  describe("AppointmentAssignedHandler", () => {
    let handler: AppointmentAssignedHandler;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AppointmentAssignedHandler,
          { provide: "NotificationPort", useValue: mockNotificationPort },
        ],
      }).compile();

      handler = module.get<AppointmentAssignedHandler>(
        AppointmentAssignedHandler,
      );
    });

    it("should have the correct eventType", () => {
      expect(handler.eventType).toBe("AppointmentAssignedEvent");
    });

    it("should notify on AppointmentAssignedEvent", async () => {
      const event = new AppointmentAssignedEvent(dummyAppointment);

      await handler.handle(event);

      expect(
        mockNotificationPort.notifyAppointmentUpdated,
      ).toHaveBeenCalledWith(dummyAppointment);
    });
  });
});
