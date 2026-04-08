import { RegisterAppointmentUseCaseImpl } from "../../../../src/application/use-cases/register-appointment.use-case.impl";
import { RegisterAppointmentCommand } from "../../../../src/domain/commands/register-appointment.command";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { DuplicateActiveAppointmentError } from "../../../../src/domain/errors/duplicate-active-appointment.error";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";
import { MockAppointmentRepository } from "../../../fixtures/mocks/mock-appointment-repository";
import { MockClockPort } from "../../../fixtures/mocks/mock-clock.port";
import { MockLoggerPort } from "../../../fixtures/mocks/mock-logger.port";

describe("RegisterAppointmentUseCaseImpl", () => {
  let useCase: RegisterAppointmentUseCaseImpl;
  let mockRepository: MockAppointmentRepository;
  let mockLogger: MockLoggerPort;
  let mockClock: MockClockPort;

  beforeEach(() => {
    mockRepository = new MockAppointmentRepository();
    mockLogger = new MockLoggerPort();
    mockClock = new MockClockPort(1000000); // Fixed timestamp for deterministic tests
    useCase = new RegisterAppointmentUseCaseImpl(
      mockRepository,
      mockLogger,
      mockClock,
    );
  });

  describe("execute", () => {
    it("should create and save a new appointment with valid input", async () => {
      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      const result = await useCase.execute(command);

      expect(result).toBeDefined();
      expect(result.idCard.toValue()).toBe(123456789);
      expect(result.fullName.toValue()).toBe("Juan Pérez");
      expect(result.status).toBe("waiting");
      expect(result.priority.toValue()).toBe("medium"); // Default priority
      expect(mockRepository.saveCalls).toHaveLength(1);
    });

    it("should create appointment with custom priority", async () => {
      const command = new RegisterAppointmentCommand(
        987654321,
        "María García",
        "high",
      );

      const result = await useCase.execute(command);

      expect(result.priority.toValue()).toBe("high");
      expect(result.fullName.toValue()).toBe("María García");
    });

    it("should use determined timestamp from ClockPort", async () => {
      const fixedTime = 2000000;
      mockClock.setCurrentTime(fixedTime);

      const command = new RegisterAppointmentCommand(123456789, "Test Patient");

      const result = await useCase.execute(command);

      expect(result.timestamp).toBe(fixedTime);
    });

    it("should log registration event", async () => {
      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      await useCase.execute(command);

      expect(
        mockLogger.hasLog("Processing registration for patient 123456789"),
      ).toBe(true);
      expect(
        mockLogger.hasLog("Appointment registered for patient 123456789"),
      ).toBe(true);
    });

    it("should record AppointmentRegisteredEvent in domain", async () => {
      mockRepository.setFindByIdCardAndActiveResult(null); // No existing appointment

      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      const result = await useCase.execute(command);

      const events = result.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe("AppointmentRegisteredEvent");
    });

    it("should reject invalid IdCard (too small)", async () => {
      const command = new RegisterAppointmentCommand(
        12345, // Too small (< 6 digits)
        "Juan Pérez",
      );

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should reject invalid IdCard (too large)", async () => {
      const command = new RegisterAppointmentCommand(
        99999999999999, // Too large (> 12 digits)
        "Juan Pérez",
      );

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should reject invalid full name (too short)", async () => {
      const command = new RegisterAppointmentCommand(
        123456789,
        "J", // Too short (< 2 chars)
      );

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should reject invalid priority", async () => {
      const command = new RegisterAppointmentCommand(
        123456789,
        "Juan Pérez",
        "invalid-priority",
      );

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should throw DuplicateActiveAppointmentError when patient already has an active appointment", async () => {
      const existingAppointment = new Appointment(
        new IdCard(123456789),
        new FullName("Juan Pérez"),
        new Priority("medium"),
        "waiting",
        null,
        1000000,
      );

      mockRepository.setFindByIdCardAndActiveResult(existingAppointment);

      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      await expect(useCase.execute(command)).rejects.toThrow(
        DuplicateActiveAppointmentError,
      );
      expect(mockRepository.saveCalls).toHaveLength(0);
      expect(mockLogger.hasLog("already has an active appointment")).toBe(true);
    });

    it("should throw DuplicateActiveAppointmentError with code DUPLICATE_ACTIVE_APPOINTMENT", async () => {
      const existingAppointment = new Appointment(
        new IdCard(123456789),
        new FullName("Juan Pérez"),
        new Priority("medium"),
        "waiting",
      );
      mockRepository.setFindByIdCardAndActiveResult(existingAppointment);

      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      try {
        await useCase.execute(command);
        fail("Expected DuplicateActiveAppointmentError to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(DuplicateActiveAppointmentError);
        expect((err as DuplicateActiveAppointmentError).code).toBe(
          "DUPLICATE_ACTIVE_APPOINTMENT",
        );
      }
    });

    it("should handle repository errors gracefully", async () => {
      mockRepository.setThrowOnFindByIdCardAndActive(true);

      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should handle save errors from repository", async () => {
      mockRepository.setThrowOnSave(true);

      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      await expect(useCase.execute(command)).rejects.toThrow();
    });

    it("should process multiple registrations independently", async () => {
      const command1 = new RegisterAppointmentCommand(111111111, "Patient One");

      const command2 = new RegisterAppointmentCommand(222222222, "Patient Two");

      const result1 = await useCase.execute(command1);
      const result2 = await useCase.execute(command2);

      expect(result1.idCard.toValue()).toBe(111111111);
      expect(result2.idCard.toValue()).toBe(222222222);
      expect(mockRepository.saveCalls).toHaveLength(2);
    });

    it("should handle whitespace in full name", async () => {
      const command = new RegisterAppointmentCommand(
        123456789,
        "  Juan  Pérez  ", // With extra whitespace
      );

      const result = await useCase.execute(command);

      // FullName VO trims, so should be normalized
      expect(result.fullName.toValue()).toBe("Juan  Pérez");
    });
  });

  describe("integration with domain factory", () => {
    it("should use AppointmentFactory for consistent creation", async () => {
      const command = new RegisterAppointmentCommand(
        123456789,
        "Juan Pérez",
        "high",
      );

      const result = await useCase.execute(command);

      expect(result.status).toBe("waiting");
      expect(result.office).toBeNull();
      expect(result.priority.toValue()).toBe("high");
    });

    it("should create with default medium priority when not specified", async () => {
      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      const result = await useCase.execute(command);

      expect(result.priority.toValue()).toBe("medium");
    });
  });

  describe("logging behavior", () => {
    it("should log all major steps", async () => {
      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      await useCase.execute(command);

      const logs = mockLogger.logs;
      expect(logs.length).toBeGreaterThan(0);
      expect(
        logs.some((l) => l.message.includes("Processing registration")),
      ).toBe(true);
      expect(
        logs.some((l) => l.message.includes("Appointment registered")),
      ).toBe(true);
    });

    it("should include context in log entries", async () => {
      const command = new RegisterAppointmentCommand(123456789, "Juan Pérez");

      await useCase.execute(command);

      const logs = mockLogger.logs;
      expect(logs.some((l) => l.context === "RegisterAppointmentUseCase")).toBe(
        true,
      );
    });
  });
});
