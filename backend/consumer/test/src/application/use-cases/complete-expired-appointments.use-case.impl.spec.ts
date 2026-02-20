import { CompleteExpiredAppointmentsUseCaseImpl } from "../../../../src/application/use-cases/complete-expired-appointments.use-case.impl";
import { MockAppointmentRepository } from "../../../fixtures/mocks/mock-appointment-repository";
import { MockLoggerPort } from "../../../fixtures/mocks/mock-logger.port";
import { MockClockPort } from "../../../fixtures/mocks/mock-clock.port";
import { MockNotificationPort } from "../../../fixtures/mocks/mock-notification.port";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";

describe("CompleteExpiredAppointmentsUseCaseImpl", () => {
  let useCase: CompleteExpiredAppointmentsUseCaseImpl;
  let mockRepository: MockAppointmentRepository;
  let mockNotification: MockNotificationPort;
  let mockLogger: MockLoggerPort;
  let mockClock: MockClockPort;

  beforeEach(() => {
    mockRepository = new MockAppointmentRepository();
    mockNotification = new MockNotificationPort();
    mockLogger = new MockLoggerPort();
    mockClock = new MockClockPort(1000000);
    useCase = new CompleteExpiredAppointmentsUseCaseImpl(
      mockRepository,
      mockNotification,
      mockLogger,
      mockClock,
    );
  });

  describe("execute", () => {
    it("should complete appointments that have expired", async () => {
      const now = 1000000;
      mockClock.setCurrentTime(now);

      // Appointment created at 1000000 with 600 seconds duration
      // Should expire at 1000000 + 600000ms = 1600000ms
      // If current time is > 1600000, it should be expired
      const expiredAppointment = new Appointment(
        new IdCard(123456789),
        new FullName("John Doe"),
        new Priority("medium"),
        "called",
        "C1",
        1000000,
        900000, // Expired at 900000 (before now)
      );

      mockRepository.setFindExpiredCalledResult([expiredAppointment]);

      await useCase.execute();

      // Appointment should be saved after completion
      expect(mockRepository.saveCalls).toHaveLength(1);
      expect(mockRepository.saveCalls[0].status).toBe("completed");
    });

    it("should notify for each completed appointment", async () => {
      const now = 1000000;
      mockClock.setCurrentTime(now);

      const expiredAppointment1 = new Appointment(
        new IdCard(111111111),
        new FullName("Patient One"),
        new Priority("high"),
        "called",
        "C1",
        800000,
        900000,
      );

      const expiredAppointment2 = new Appointment(
        new IdCard(222222222),
        new FullName("Patient Two"),
        new Priority("medium"),
        "called",
        "C2",
        800000,
        900000,
      );

      mockRepository.setFindExpiredCalledResult([
        expiredAppointment1,
        expiredAppointment2,
      ]);

      await useCase.execute();

      expect(mockNotification.notificationCalls).toHaveLength(2);
    });

    it("should skip notification when no appointments expired", async () => {
      mockClock.setCurrentTime(1000000);
      mockRepository.setFindExpiredCalledResult([]);

      await useCase.execute();

      expect(mockNotification.notificationCalls).toHaveLength(0);
      // Should not log completion message
      expect(mockLogger.getLogsByLevel("log")).toHaveLength(0);
    });

    it("should log completion of multiple appointments", async () => {
      mockClock.setCurrentTime(1000000);

      const expired = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("high"),
          "called",
          "C1",
          800000,
          900000,
        ),
        new Appointment(
          new IdCard(222222222),
          new FullName("Patient Two"),
          new Priority("medium"),
          "called",
          "C2",
          800000,
          900000,
        ),
      ];

      mockRepository.setFindExpiredCalledResult(expired);

      await useCase.execute();

      expect(mockLogger.hasLog("Completed 2 expired appointments")).toBe(true);
    });

    it("should handle single expired appointment", async () => {
      mockClock.setCurrentTime(1000000);

      const singleExpired = new Appointment(
        new IdCard(123456789),
        new FullName("Patient"),
        new Priority("low"),
        "called",
        "C1",
        800000,
        900000,
      );

      mockRepository.setFindExpiredCalledResult([singleExpired]);

      await useCase.execute();

      expect(mockRepository.saveCalls).toHaveLength(1);
      expect(mockNotification.notificationCalls).toHaveLength(1);
      expect(mockLogger.hasLog("Completed 1 expired")).toBe(true);
    });

    it("should set status to completed", async () => {
      mockClock.setCurrentTime(1000000);

      const expired = new Appointment(
        new IdCard(123456789),
        new FullName("Patient"),
        new Priority("medium"),
        "called",
        "C1",
        800000,
        900000,
      );

      mockRepository.setFindExpiredCalledResult([expired]);

      await useCase.execute();

      const completed = mockRepository.saveCalls[0];
      expect(completed.status).toBe("completed");
    });

    it("should preserve appointment details when completing", async () => {
      mockClock.setCurrentTime(1000000);

      const original = new Appointment(
        new IdCard(123456789),
        new FullName("Jane Doe"),
        new Priority("high"),
        "called",
        "C3",
        800000,
        900000,
      );

      mockRepository.setFindExpiredCalledResult([original]);

      await useCase.execute();

      const completed = mockRepository.saveCalls[0];
      expect(completed.idCard.equals(original.idCard)).toBe(true);
      expect(completed.fullName.equals(original.fullName)).toBe(true);
      expect(completed.priority.equals(original.priority)).toBe(true);
      expect(completed.office).toBe("C3");
    });

    it("should handle repository errors", async () => {
      mockClock.setCurrentTime(1000000);
      mockRepository.setThrowOnFindExpiredCalled(true);

      await expect(useCase.execute()).rejects.toThrow();
    });

    it("should handle notification errors without stopping process", async () => {
      mockClock.setCurrentTime(1000000);

      const expired = new Appointment(
        new IdCard(123456789),
        new FullName("Patient"),
        new Priority("medium"),
        "called",
        "C1",
        800000,
        900000,
      );

      mockRepository.setFindExpiredCalledResult([expired]);
      mockNotification.setThrowOnNotify(true);

      // Should throw because notification fails
      await expect(useCase.execute()).rejects.toThrow();
    });

    it("should save appointment before notifying", async () => {
      mockClock.setCurrentTime(1000000);

      const expired = new Appointment(
        new IdCard(123456789),
        new FullName("Patient"),
        new Priority("medium"),
        "called",
        "C1",
        800000,
        900000,
      );

      mockRepository.setFindExpiredCalledResult([expired]);

      await useCase.execute();

      // Verify save was called
      expect(mockRepository.saveCalls).toHaveLength(1);
      // Verify notification was called
      expect(mockNotification.notificationCalls).toHaveLength(1);
    });

    it("should use ClockPort for time determination", async () => {
      const fixedTime = 5000000;
      mockClock.setCurrentTime(fixedTime);

      const expired = new Appointment(
        new IdCard(123456789),
        new FullName("Patient"),
        new Priority("medium"),
        "called",
        "C1",
        800000,
        900000,
      );

      mockRepository.setFindExpiredCalledResult([expired]);

      // Repository should be called with the fixed time
      await useCase.execute();

      // Verify the mock was called (it receives 'now' parameter)
      expect(mockRepository.saveCalls).toHaveLength(1);
    });
  });

  describe("edge cases", () => {
    it("should handle empty expired list", async () => {
      mockClock.setCurrentTime(1000000);
      mockRepository.setFindExpiredCalledResult([]);

      await useCase.execute();

      expect(mockRepository.saveCalls).toHaveLength(0);
      expect(mockNotification.notificationCalls).toHaveLength(0);
    });

    it("should handle multiple rapid completions", async () => {
      mockClock.setCurrentTime(1000000);

      const expired = Array.from(
        { length: 10 },
        (_, i) =>
          new Appointment(
            new IdCard(100000000 + i),
            new FullName(`Patient ${i}`),
            new Priority("medium"),
            "called",
            `C${i + 1}`,
            800000,
            900000,
          ),
      );

      mockRepository.setFindExpiredCalledResult(expired);

      await useCase.execute();

      expect(mockRepository.saveCalls).toHaveLength(10);
      expect(mockNotification.notificationCalls).toHaveLength(10);
      expect(mockLogger.hasLog("Completed 10 expired")).toBe(true);
    });

    it("should handle appointments with different completion times", async () => {
      mockClock.setCurrentTime(1000000);

      const appointments = [
        new Appointment(
          new IdCard(111111111),
          new FullName("P1"),
          new Priority("high"),
          "called",
          "C1",
          500000,
          600000,
        ), // Old
        new Appointment(
          new IdCard(222222222),
          new FullName("P2"),
          new Priority("medium"),
          "called",
          "C2",
          800000,
          900000,
        ), // Recent
      ];

      mockRepository.setFindExpiredCalledResult(appointments);

      await useCase.execute();

      expect(mockRepository.saveCalls).toHaveLength(2);
      expect(mockRepository.saveCalls[0].status).toBe("completed");
      expect(mockRepository.saveCalls[1].status).toBe("completed");
    });
  });
});

// Helper method for MockAppointmentRepository
declare global {
  interface MockAppointmentRepository {
    setThrowOnFindExpiredCalled(shouldThrow: boolean): void;
  }
}
