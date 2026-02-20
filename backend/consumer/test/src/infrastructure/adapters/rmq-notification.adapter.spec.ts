/**
 * 🧪 Tests for RmqNotificationAdapter
 *
 * Tests RabbitMQ notification dispatch for appointment updates
 */

import { RmqNotificationAdapter } from "../../../../src/infrastructure/adapters/rmq-notification.adapter";
import { NotificationsService } from "../../../../src/notifications/notifications.service";
import { ClientProxy } from "@nestjs/microservices";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { AppointmentNotificationPayload } from "../../../../src/infrastructure/adapters/appointment-notification.payload";
import { of } from "rxjs";

describe("RmqNotificationAdapter", () => {
  let adapter: RmqNotificationAdapter;
  let mockNotificationsService: jest.Mocked<NotificationsService>;
  let mockRmqClient: jest.Mocked<ClientProxy>;

  // Helper to create test appointment (readonly properties)
  const createMockAppointment = (
    overrides: Partial<Appointment> = {},
  ): Appointment => {
    const defaultMocks = {
      id: "apt-001",
      fullName: { toValue: () => "John Doe" } as any,
      idCard: { toValue: () => "123456789" } as any,
      office: "office-1",
      status: "called" as const,
      priority: { toValue: () => "high" } as any,
      timestamp: 1708435200000,
      completedAt: null,
    };
    return { ...defaultMocks, ...overrides } as any as Appointment;
  };

  beforeEach(() => {
    // Mock local notifications service
    mockNotificationsService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock RMQ ClientProxy - emit returns Observable
    mockRmqClient = {
      emit: jest.fn().mockReturnValue(of(undefined)),
    } as any;

    // Create adapter
    adapter = new RmqNotificationAdapter(
      mockNotificationsService,
      mockRmqClient,
    );
  });

  describe("notifyAppointmentUpdated()", () => {
    it("should call local notifications service with idCard and office", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
        "123456789",
        "office-1",
      );
    });

    it("should extract idCard value using toValue()", async () => {
      const appointment = createMockAppointment({
        idCard: { toValue: () => "987654321x" } as any,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
        "987654321x",
        "office-1",
      );
    });

    it("should emit RMQ event with correct pattern", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      const callArgs = mockRmqClient.emit.mock.calls[0];
      expect(callArgs[0]).toBe("appointment_created");
    });

    it("should map appointment to payload correctly", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock
        .calls[0][1] as AppointmentNotificationPayload;

      expect(payload.id).toBe("apt-001");
      expect(payload.fullName).toBe("John Doe");
      expect(payload.idCard).toBe("123456789");
      expect(payload.office).toBe("office-1");
      expect(payload.status).toBe("called");
      expect(payload.priority).toBe("high");
      expect(payload.timestamp).toBe(1708435200000);
      expect(payload.completedAt).toBe(null);
    });

    it("should not emit if local notification fails", async () => {
      mockNotificationsService.sendNotification.mockRejectedValueOnce(
        new Error("Service down"),
      );

      const appointment = createMockAppointment();

      await expect(
        adapter.notifyAppointmentUpdated(appointment),
      ).rejects.toThrow("Service down");

      // RMQ emit should NOT be called because error is thrown first
      expect(mockRmqClient.emit).not.toHaveBeenCalled();
    });

    it("should handle null office", async () => {
      const appointment = createMockAppointment({
        office: null,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
        "123456789",
        null,
      );

      const payload = mockRmqClient.emit.mock
        .calls[0][1] as AppointmentNotificationPayload;
      expect(payload.office).toBeNull();
    });

    it("should handle completed appointments with completedAt", async () => {
      const appointment = createMockAppointment({
        completedAt: 1708435300000,
        office: "office-2",
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock
        .calls[0][1] as AppointmentNotificationPayload;
      expect(payload.completedAt).toBe(1708435300000);
      expect(payload.office).toBe("office-2");
    });
  });

  describe("Payload Mapping", () => {
    it("should use VO.toValue() for value objects", async () => {
      const mockFullNameVO = { toValue: jest.fn(() => "Jane Doe") };
      const mockIdCardVO = { toValue: jest.fn(() => "555555555") };
      const mockPriorityVO = { toValue: jest.fn(() => "low") };

      const appointment = createMockAppointment({
        fullName: mockFullNameVO as any,
        idCard: mockIdCardVO as any,
        priority: mockPriorityVO as any,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      expect(mockFullNameVO.toValue).toHaveBeenCalled();
      expect(mockIdCardVO.toValue).toHaveBeenCalled();
      expect(mockPriorityVO.toValue).toHaveBeenCalled();

      const payload = mockRmqClient.emit.mock
        .calls[0][1] as AppointmentNotificationPayload;
      expect(payload.fullName).toBe("Jane Doe");
      expect(payload.idCard).toBe("555555555");
      expect(payload.priority).toBe("low");
    });

    it("should preserve primitive types in payload", async () => {
      const appointment = createMockAppointment({
        id: "custom-id-123",
        status: "waiting",
        timestamp: 999999999,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock
        .calls[0][1] as AppointmentNotificationPayload;
      expect(payload.id).toBe("custom-id-123");
      expect(payload.status).toBe("waiting");
      expect(payload.timestamp).toBe(999999999);
    });

    it("payload should be AppointmentNotificationPayload shape", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock
        .calls[0][1] as AppointmentNotificationPayload;

      // Check all required fields exist
      expect(payload).toHaveProperty("id");
      expect(payload).toHaveProperty("fullName");
      expect(payload).toHaveProperty("idCard");
      expect(payload).toHaveProperty("office");
      expect(payload).toHaveProperty("status");
      expect(payload).toHaveProperty("priority");
      expect(payload).toHaveProperty("timestamp");
      expect(payload).toHaveProperty("completedAt");
    });
  });

  describe("Integration Pattern", () => {
    it("should implement NotificationPort interface", () => {
      expect(adapter).toHaveProperty("notifyAppointmentUpdated");
      expect(typeof adapter.notifyAppointmentUpdated).toBe("function");
    });

    it("should call both local and global notification channels", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      expect(mockNotificationsService.sendNotification).toHaveBeenCalledTimes(
        1,
      );
      expect(mockRmqClient.emit).toHaveBeenCalledTimes(1);
    });

    it("should sequence: local notification, then emit RMQ", async () => {
      const callOrder: string[] = [];

      mockNotificationsService.sendNotification.mockImplementation(async () => {
        callOrder.push("local");
      });

      mockRmqClient.emit.mockImplementation(
        (pattern: string, data: unknown) => {
          callOrder.push("rmq");
          return of(undefined);
        },
      );

      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      // Local should be awaited first
      expect(callOrder[0]).toBe("local");
      // RMQ emit happens after
      expect(callOrder[1]).toBe("rmq");
    });
  });

  describe("Error Handling", () => {
    it("should propagate local notification errors", async () => {
      const localError = new Error("Database connection failed");
      mockNotificationsService.sendNotification.mockRejectedValueOnce(
        localError,
      );

      const appointment = createMockAppointment();

      await expect(
        adapter.notifyAppointmentUpdated(appointment),
      ).rejects.toThrow("Database connection failed");
    });

    it("should not emit if local notification fails", async () => {
      mockNotificationsService.sendNotification.mockRejectedValueOnce(
        new Error("Local service error"),
      );

      const appointment = createMockAppointment();

      try {
        await adapter.notifyAppointmentUpdated(appointment);
      } catch {
        // Error is expected
      }

      // RMQ emit should NOT have been called because error is thrown first
      expect(mockRmqClient.emit).not.toHaveBeenCalled();
    });

    it("should propagate RMQ emit errors when thrown synchronously", async () => {
      // emit() is not awaited, but synchronous errors still propagate
      mockRmqClient.emit.mockImplementation(() => {
        throw new Error("RMQ connection error");
      });

      const appointment = createMockAppointment();

      // Error propagates because emit throws synchronously
      await expect(
        adapter.notifyAppointmentUpdated(appointment),
      ).rejects.toThrow("RMQ connection error");
    });
  });

  describe("Multiple Notifications", () => {
    it("should handle consecutive notifications", async () => {
      const apt1 = createMockAppointment({ id: "apt-001" });
      const apt2 = createMockAppointment({ id: "apt-002" });

      await adapter.notifyAppointmentUpdated(apt1);
      await adapter.notifyAppointmentUpdated(apt2);

      expect(mockNotificationsService.sendNotification).toHaveBeenCalledTimes(
        2,
      );
      expect(mockRmqClient.emit).toHaveBeenCalledTimes(2);
    });

    it("should emit different payloads for different appointments", async () => {
      const apt1 = createMockAppointment({
        id: "apt-001",
        fullName: { toValue: () => "Alice" } as any,
      });
      const apt2 = createMockAppointment({
        id: "apt-002",
        fullName: { toValue: () => "Bob" } as any,
      });

      await adapter.notifyAppointmentUpdated(apt1);
      await adapter.notifyAppointmentUpdated(apt2);

      const payload1 = mockRmqClient.emit.mock
        .calls[0][1] as AppointmentNotificationPayload;
      const payload2 = mockRmqClient.emit.mock
        .calls[1][1] as AppointmentNotificationPayload;

      expect(payload1.id).toBe("apt-001");
      expect(payload1.fullName).toBe("Alice");

      expect(payload2.id).toBe("apt-002");
      expect(payload2.fullName).toBe("Bob");
    });
  });
});
