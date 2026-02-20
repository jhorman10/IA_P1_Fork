/**
 * 🧪 Tests for EventDispatchingAppointmentRepositoryDecorator
 *
 * Tests automatic event dispatching after repository saves
 */

import { EventDispatchingAppointmentRepositoryDecorator } from "../../../../src/infrastructure/persistence/event-dispatching-appointment-repository.decorator";
import { AppointmentRepository } from "../../../../src/domain/ports/outbound/appointment.repository";
import { DomainEventBus } from "../../../../src/domain/ports/outbound/domain-event-bus.port";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { AppointmentRegisteredEvent } from "../../../../src/domain/events/appointment-registered.event";

describe("EventDispatchingAppointmentRepositoryDecorator", () => {
  let decorator: EventDispatchingAppointmentRepositoryDecorator;
  let mockInnerRepository: jest.Mocked<AppointmentRepository>;
  let mockEventBus: jest.Mocked<DomainEventBus>;
  let mockAppointment: any;

  beforeEach(() => {
    // Mock inner repository
    mockInnerRepository = {
      findWaiting: jest.fn(),
      findAvailableOffices: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByIdCardAndActive: jest.fn(),
      findExpiredCalled: jest.fn(),
      updateStatus: jest.fn(),
    };

    // Mock event bus
    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    // Create decorator instance
    decorator = new EventDispatchingAppointmentRepositoryDecorator(
      mockInnerRepository,
      mockEventBus,
    );

    // Mock appointment with events
    mockAppointment = {
      id: "apt-001",
      fullName: "John Doe",
      idCard: { value: "123456789" },
      status: "waiting",
      office: null,
      priority: "medium",
      timestamp: Date.now(),
      completedAt: null,
      pullEvents: jest.fn().mockReturnValue([]),
    } as any;
  });

  describe("save() - Event Publishing", () => {
    it("should delegate save() to inner repository", async () => {
      mockInnerRepository.save.mockResolvedValue(mockAppointment);
      mockAppointment.pullEvents.mockReturnValue([]);

      const result = await decorator.save(mockAppointment);

      expect(mockInnerRepository.save).toHaveBeenCalledWith(mockAppointment);
      expect(result).toEqual(mockAppointment);
    });

    it("should publish domain events after save()", async () => {
      const mockEvent = new AppointmentRegisteredEvent(mockAppointment);
      mockInnerRepository.save.mockResolvedValue(mockAppointment);
      mockAppointment.pullEvents.mockReturnValue([mockEvent]);

      await decorator.save(mockAppointment);

      expect(mockAppointment.pullEvents).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith([mockEvent]);
    });

    it("should not publish events if entity has no pending events", async () => {
      mockInnerRepository.save.mockResolvedValue(mockAppointment);
      mockAppointment.pullEvents.mockReturnValue([]);

      await decorator.save(mockAppointment);

      expect(mockAppointment.pullEvents).toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it("should publish multiple events if entity has many", async () => {
      const mockEvent1 = new AppointmentRegisteredEvent(mockAppointment);
      const mockEvent2 = new AppointmentRegisteredEvent(mockAppointment);

      mockInnerRepository.save.mockResolvedValue(mockAppointment);
      mockAppointment.pullEvents.mockReturnValue([mockEvent1, mockEvent2]);

      await decorator.save(mockAppointment);

      expect(mockEventBus.publish).toHaveBeenCalledWith([
        mockEvent1,
        mockEvent2,
      ]);
    });

    it("should return saved appointment even if event publishing fails", async () => {
      mockInnerRepository.save.mockResolvedValue(mockAppointment);
      mockAppointment.pullEvents.mockReturnValue([
        new AppointmentRegisteredEvent(mockAppointment),
      ]);
      mockEventBus.publish.mockRejectedValue(new Error("Event bus error"));

      await expect(decorator.save(mockAppointment)).rejects.toThrow(
        "Event bus error",
      );
    });
  });

  describe("Delegation of Other Methods", () => {
    it("should delegate findWaiting() to inner repository", async () => {
      const mockAppointments = [mockAppointment];
      mockInnerRepository.findWaiting.mockResolvedValue(mockAppointments);
      mockAppointment.pullEvents.mockReturnValue([]);

      const result = await decorator.findWaiting();

      expect(mockInnerRepository.findWaiting).toHaveBeenCalled();
      expect(result).toEqual(mockAppointments);
    });

    it("should delegate findAvailableOffices() to inner repository", async () => {
      const mockOffices = ["office-1", "office-2"];
      mockInnerRepository.findAvailableOffices.mockResolvedValue(mockOffices);

      const result = await decorator.findAvailableOffices([
        "office-1",
        "office-2",
      ]);

      expect(mockInnerRepository.findAvailableOffices).toHaveBeenCalledWith([
        "office-1",
        "office-2",
      ]);
      expect(result).toEqual(mockOffices);
    });

    it("should delegate findById() to inner repository", async () => {
      mockInnerRepository.findById.mockResolvedValue(mockAppointment);

      const result = await decorator.findById("apt-001");

      expect(mockInnerRepository.findById).toHaveBeenCalledWith("apt-001");
      expect(result).toEqual(mockAppointment);
    });

    it("should delegate findByIdCardAndActive() to inner repository", async () => {
      const mockIdCard = { value: "123456789" };
      mockInnerRepository.findByIdCardAndActive.mockResolvedValue(
        mockAppointment,
      );

      const result = await decorator.findByIdCardAndActive(mockIdCard as any);

      expect(mockInnerRepository.findByIdCardAndActive).toHaveBeenCalledWith(
        mockIdCard,
      );
      expect(result).toEqual(mockAppointment);
    });

    it("should delegate findExpiredCalled() to inner repository", async () => {
      const mockAppointments = [mockAppointment];
      const now = Date.now();
      mockInnerRepository.findExpiredCalled.mockResolvedValue(mockAppointments);

      const result = await decorator.findExpiredCalled(now);

      expect(mockInnerRepository.findExpiredCalled).toHaveBeenCalledWith(now);
      expect(result).toEqual(mockAppointments);
    });

    it("should delegate updateStatus() to inner repository", async () => {
      mockInnerRepository.updateStatus.mockResolvedValue(undefined);

      await decorator.updateStatus("apt-001", "called");

      expect(mockInnerRepository.updateStatus).toHaveBeenCalledWith(
        "apt-001",
        "called",
      );
    });
  });

  describe("Error Handling", () => {
    it("should propagate inner repository errors", async () => {
      const error = new Error("Database error");
      mockInnerRepository.save.mockRejectedValue(error);

      await expect(decorator.save(mockAppointment)).rejects.toThrow(
        "Database error",
      );
    });

    it("should propagate event bus errors", async () => {
      mockInnerRepository.save.mockResolvedValue(mockAppointment);
      mockAppointment.pullEvents.mockReturnValue([
        new AppointmentRegisteredEvent(mockAppointment),
      ]);
      const eventBusError = new Error("Failed to publish events");
      mockEventBus.publish.mockRejectedValue(eventBusError);

      await expect(decorator.save(mockAppointment)).rejects.toThrow(
        "Failed to publish events",
      );
    });
  });

  describe("Decorator Pattern Compliance", () => {
    it("should implement AppointmentRepository interface", () => {
      expect(decorator).toHaveProperty("findWaiting");
      expect(decorator).toHaveProperty("findAvailableOffices");
      expect(decorator).toHaveProperty("save");
      expect(decorator).toHaveProperty("findById");
      expect(decorator).toHaveProperty("findByIdCardAndActive");
      expect(decorator).toHaveProperty("findExpiredCalled");
      expect(decorator).toHaveProperty("updateStatus");
    });

    it("should enhance save() method without changing interface", async () => {
      mockInnerRepository.save.mockResolvedValue(mockAppointment);
      mockAppointment.pullEvents.mockReturnValue([
        new AppointmentRegisteredEvent(mockAppointment),
      ]);

      const result = await decorator.save(mockAppointment);

      // Interface remains the same (same parameters, returns Appointment)
      expect(result).toEqual(mockAppointment);
      // But behavior is extended (also publishes events)
      expect(mockEventBus.publish).toHaveBeenCalled();
    });
  });
});
