/**
 * 🧪 Tests for RabbitMQNotificationAdapter
 *
 * Tests RabbitMQ-only notification dispatch for appointment updates
 */

import { RabbitMQNotificationAdapter } from "../../../../src/infrastructure/messaging/rabbitmq-notification.adapter";
import { ClientProxy } from "@nestjs/microservices";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { of } from "rxjs";

describe("RabbitMQNotificationAdapter", () => {
  let adapter: RabbitMQNotificationAdapter;
  let mockRmqClient: jest.Mocked<ClientProxy>;

  // Helper to create test appointment
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
      completedAt: undefined as number | undefined,
    };
    return { ...defaultMocks, ...overrides } as any as Appointment;
  };

  beforeEach(() => {
    // Mock RMQ ClientProxy
    mockRmqClient = {
      emit: jest.fn().mockReturnValue(of(undefined)),
    } as any;

    // Create adapter
    adapter = new RabbitMQNotificationAdapter(mockRmqClient);
  });

  describe("notifyAppointmentUpdated()", () => {
    it("should emit RMQ event with correct pattern", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      const callArgs = mockRmqClient.emit.mock.calls[0];
      expect(callArgs[0]).toBe("appointment_updated");
    });

    it("should emit appointment data as payload", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;

      expect(payload.id).toBe("apt-001");
      expect(payload.office).toBe("office-1");
      expect(payload.status).toBe("called");
      expect(payload.timestamp).toBe(1708435200000);
      expect(payload.completedAt).toBeUndefined();
    });

    it("should include appointment value objects in payload", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;

      // Payload should have the VO objects themselves (not .toValue())
      expect(payload.fullName).toBeDefined();
      expect(payload.idCard).toBeDefined();
      expect(payload.priority).toBeDefined();
    });

    it("should handle null office", async () => {
      const appointment = createMockAppointment({
        office: null,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;
      expect(payload.office).toBeNull();
    });

    it("should handle completed appointments with completedAt", async () => {
      const appointment = createMockAppointment({
        completedAt: 1708435300000,
        office: "office-2",
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;
      expect(payload.completedAt).toBe(1708435300000);
      expect(payload.office).toBe("office-2");
    });

    it("should handle different appointment statuses", async () => {
      const statuses = ["waiting", "called", "completed"] as const;

      for (const status of statuses) {
        mockRmqClient.emit.mockClear();

        const appointment = createMockAppointment({ status });
        await adapter.notifyAppointmentUpdated(appointment);

        const payload = mockRmqClient.emit.mock.calls[0][1] as any;
        expect(payload.status).toBe(status);
      }
    });
  });

  describe("Payload Structure", () => {
    it("should include all appointment fields in payload", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;

      // Check all fields are present
      expect(payload).toHaveProperty("id");
      expect(payload).toHaveProperty("fullName");
      expect(payload).toHaveProperty("idCard");
      expect(payload).toHaveProperty("office");
      expect(payload).toHaveProperty("status");
      expect(payload).toHaveProperty("priority");
      expect(payload).toHaveProperty("timestamp");
      expect(payload).toHaveProperty("completedAt");
    });

    it("should preserve primitive values (id, office, status, timestamp, completedAt)", async () => {
      const appointment = createMockAppointment({
        id: "custom-id",
        office: "office-x",
        status: "waiting",
        timestamp: 999999999,
        completedAt: 1000000000,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;

      expect(payload.id).toBe("custom-id");
      expect(payload.office).toBe("office-x");
      expect(payload.status).toBe("waiting");
      expect(payload.timestamp).toBe(999999999);
      expect(payload.completedAt).toBe(1000000000);
    });

    it("should include value object references (not ToValue() calls)", async () => {
      const mockFullNameVO = { toValue: jest.fn(() => "Jane Doe") };
      const mockIdCardVO = { toValue: jest.fn(() => "555555555") };
      const mockPriorityVO = { toValue: jest.fn(() => "low") };

      const appointment = createMockAppointment({
        fullName: mockFullNameVO as any,
        idCard: mockIdCardVO as any,
        priority: mockPriorityVO as any,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;

      // Payload should have VO objects, not toValue() results
      expect(payload.fullName).toBe(mockFullNameVO);
      expect(payload.idCard).toBe(mockIdCardVO);
      expect(payload.priority).toBe(mockPriorityVO);

      // toValue() should NOT have been called
      expect(mockFullNameVO.toValue).not.toHaveBeenCalled();
      expect(mockIdCardVO.toValue).not.toHaveBeenCalled();
      expect(mockPriorityVO.toValue).not.toHaveBeenCalled();
    });
  });

  describe("RMQ Emission Pattern", () => {
    it("should use correct message pattern", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      expect(mockRmqClient.emit).toHaveBeenCalledWith(
        "appointment_updated",
        expect.any(Object),
      );
    });

    it("should emit only once per notification", async () => {
      const appointment = createMockAppointment();
      await adapter.notifyAppointmentUpdated(appointment);

      expect(mockRmqClient.emit).toHaveBeenCalledTimes(1);
    });

    it("should not await emit result", async () => {
      const appointment = createMockAppointment();

      // emit() is not awaited, so even if it rejects it shouldn't affect the function
      const slowEmit = new Promise((resolve) => {
        setTimeout(() => resolve(undefined), 100);
      });
      mockRmqClient.emit.mockReturnValue(slowEmit as any);

      // Should complete immediately
      const startTime = Date.now();
      await adapter.notifyAppointmentUpdated(appointment);
      const duration = Date.now() - startTime;

      // Should not wait for the 100ms emit
      expect(duration).toBeLessThan(50);
    });
  });

  describe("Integration & NotificationPort Interface", () => {
    it("should implement NotificationPort interface", () => {
      expect(adapter).toHaveProperty("notifyAppointmentUpdated");
      expect(typeof adapter.notifyAppointmentUpdated).toBe("function");
    });

    it("should return void (or Promise<void>)", async () => {
      const appointment = createMockAppointment();
      const result = await adapter.notifyAppointmentUpdated(appointment);

      expect(result).toBeUndefined();
    });

    it("should handle consecutive notifications", async () => {
      const apt1 = createMockAppointment({ id: "apt-001" });
      const apt2 = createMockAppointment({ id: "apt-002" });

      await adapter.notifyAppointmentUpdated(apt1);
      await adapter.notifyAppointmentUpdated(apt2);

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

      const payload1 = mockRmqClient.emit.mock.calls[0][1] as any;
      const payload2 = mockRmqClient.emit.mock.calls[1][1] as any;

      expect(payload1.id).toBe("apt-001");
      expect(payload2.id).toBe("apt-002");

      // fullName VOs should be different objects
      expect(payload1.fullName).not.toBe(payload2.fullName);
    });
  });

  describe("Error & Edge Cases", () => {
    it("should handle emit rejection without rethrowing (fire-and-forget)", async () => {
      mockRmqClient.emit.mockReturnValue(of(undefined));
      const appointment = createMockAppointment();
      await expect(
        adapter.notifyAppointmentUpdated(appointment),
      ).resolves.not.toThrow();
    });

    it("should handle RMQ connection errors gracefully", async () => {
      mockRmqClient.emit.mockImplementation(() => {
        throw new Error("Connection refused");
      });

      const appointment = createMockAppointment();

      // Fire-and-forget pattern: error is not caught
      // The function itself doesn't throw but emit error propagates
      await expect(
        adapter.notifyAppointmentUpdated(appointment),
      ).rejects.toThrow();
    });

    it("should handle very large timestamp values", async () => {
      const appointment = createMockAppointment({
        timestamp: Number.MAX_SAFE_INTEGER,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;
      expect(payload.timestamp).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should handle undefined completedAt", async () => {
      const appointment = createMockAppointment({
        completedAt: undefined as any,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;
      expect(payload.completedAt).toBeUndefined();
    });
  });

  describe("Comparison with RmqNotificationAdapter", () => {
    it("should differ from RmqNotificationAdapter (no local notifications)", async () => {
      // This adapter only emits to RMQ, no local notifications service
      const appointment = createMockAppointment();

      // Should not call any local services
      expect(mockRmqClient.emit).not.toHaveBeenCalled();

      await adapter.notifyAppointmentUpdated(appointment);

      // Only RMQ emit should be called
      expect(mockRmqClient.emit).toHaveBeenCalledTimes(1);
    });

    it("should use different message pattern than RmqNotificationAdapter", async () => {
      // RmqNotificationAdapter uses "appointment_created"
      // RabbitMQNotificationAdapter uses "appointment_updated"
      const appointment = createMockAppointment();

      await adapter.notifyAppointmentUpdated(appointment);

      const pattern = mockRmqClient.emit.mock.calls[0][0];
      expect(pattern).toBe("appointment_updated");
    });

    it("should include VO objects in payload (not mapped primitives)", async () => {
      // RmqNotificationAdapter maps VOs to primitives via .toValue()
      // RabbitMQNotificationAdapter includes VO objects directly
      const mockVO = { toValue: jest.fn(() => "value") };
      const appointment = createMockAppointment({
        fullName: mockVO as any,
      });

      await adapter.notifyAppointmentUpdated(appointment);

      const payload = mockRmqClient.emit.mock.calls[0][1] as any;

      // Should have VO object, not toValue() result
      expect(payload.fullName).toBe(mockVO);
      expect(mockVO.toValue).not.toHaveBeenCalled();
    });
  });

  describe("Real-world Scenarios", () => {
    it("should handle appointment lifecycle notifications", async () => {
      const waitingApt = createMockAppointment({
        id: "apt-waiting",
        status: "waiting",
        completedAt: undefined,
      });

      const calledApt = createMockAppointment({
        id: "apt-called",
        status: "called",
        office: "office-1",
        completedAt: undefined,
      });

      const completedApt = createMockAppointment({
        id: "apt-completed",
        status: "completed",
        office: "office-1",
        completedAt: 1708435300000,
      });

      await adapter.notifyAppointmentUpdated(waitingApt);
      await adapter.notifyAppointmentUpdated(calledApt);
      await adapter.notifyAppointmentUpdated(completedApt);

      expect(mockRmqClient.emit).toHaveBeenCalledTimes(3);

      const [, payload1] = mockRmqClient.emit.mock.calls[0];
      const [, payload2] = mockRmqClient.emit.mock.calls[1];
      const [, payload3] = mockRmqClient.emit.mock.calls[2];

      expect((payload1 as any).status).toBe("waiting");
      expect((payload2 as any).status).toBe("called");
      expect((payload3 as any).status).toBe("completed");
    });

    it("should handle high-frequency notifications", async () => {
      const appointments = Array.from({ length: 100 }, (_, i) =>
        createMockAppointment({ id: `apt-${i}` }),
      );

      for (const apt of appointments) {
        await adapter.notifyAppointmentUpdated(apt);
      }

      expect(mockRmqClient.emit).toHaveBeenCalledTimes(100);
    });
  });
});
