import { Test, TestingModule } from "@nestjs/testing";

import { EventsController } from "../../../src/events/events.controller";
import { AppointmentEventPayload } from "../../../src/types/appointment-event";

describe("EventsController", () => {
  let controller: EventsController;
  let mockBroadcaster: { broadcastAppointmentUpdated: jest.Mock };

  const buildPayload = (
    overrides: Partial<AppointmentEventPayload> = {},
  ): AppointmentEventPayload => ({
    id: "abc123",
    fullName: "John Doe",
    idCard: 1234567,
    status: "waiting",
    office: null,
    priority: "medium",
    timestamp: 1000,
    doctorId: null,
    doctorName: null,
    ...overrides,
  });

  beforeEach(async () => {
    mockBroadcaster = {
      broadcastAppointmentUpdated: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: "EventBroadcasterPort",
          useValue: mockBroadcaster,
        },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("handleAppointmentCreated", () => {
    // HUMAN CHECK: Verifica que appointment_created dispara el broadcast al WebSocket
    it("should call broadcaster when appointment_created event is received", async () => {
      const payload = buildPayload({ status: "waiting" });

      await controller.handleAppointmentCreated(payload);

      expect(mockBroadcaster.broadcastAppointmentUpdated).toHaveBeenCalledWith(
        payload,
      );
    });

    it("should pass the full payload to broadcaster without modification", async () => {
      const payload = buildPayload({ office: "3", status: "called" });

      await controller.handleAppointmentCreated(payload);

      expect(mockBroadcaster.broadcastAppointmentUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ id: payload.id, office: "3" }),
      );
    });
  });

  describe("handleAppointmentUpdated", () => {
    // HUMAN CHECK: Verifica que appointment_updated dispara el broadcast al WebSocket
    it("should call broadcaster when appointment_updated event is received", async () => {
      const payload = buildPayload({ status: "called", office: "2" });

      await controller.handleAppointmentUpdated(payload);

      expect(mockBroadcaster.broadcastAppointmentUpdated).toHaveBeenCalledWith(
        payload,
      );
    });

    it("should handle completed status", async () => {
      const payload = buildPayload({ status: "completed", completedAt: 9999 });

      await controller.handleAppointmentUpdated(payload);

      expect(mockBroadcaster.broadcastAppointmentUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ status: "completed" }),
      );
    });

    it("should call broadcaster exactly once per event", async () => {
      const payload = buildPayload();

      await controller.handleAppointmentUpdated(payload);

      expect(mockBroadcaster.broadcastAppointmentUpdated).toHaveBeenCalledTimes(
        1,
      );
    });
  });
});
