import { AssignAvailableOfficesUseCaseImpl } from "../../../../src/application/use-cases/assign-available-offices.use-case.impl";
import { MockAppointmentRepository } from "../../../fixtures/mocks/mock-appointment-repository";
import { MockLoggerPort } from "../../../fixtures/mocks/mock-logger.port";
import { MockClockPort } from "../../../fixtures/mocks/mock-clock.port";
import { ConsultationPolicy } from "../../../../src/domain/policies/consultation.policy";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";

describe("AssignAvailableOfficesUseCaseImpl", () => {
  let useCase: AssignAvailableOfficesUseCaseImpl;
  let mockRepository: MockAppointmentRepository;
  let mockLogger: MockLoggerPort;
  let mockClock: MockClockPort;
  let consultationPolicy: ConsultationPolicy;
  const TOTAL_OFFICES = 5;
  let deterministicRandom = 0.5; // Default to middle value

  beforeEach(() => {
    mockRepository = new MockAppointmentRepository();
    mockLogger = new MockLoggerPort();
    mockClock = new MockClockPort(1000000);

    // Create ConsultationPolicy with deterministic random function
    consultationPolicy = new ConsultationPolicy(() => deterministicRandom);

    useCase = new AssignAvailableOfficesUseCaseImpl(
      mockRepository,
      mockLogger,
      mockClock,
      TOTAL_OFFICES,
      consultationPolicy,
    );
  });

  describe("execute", () => {
    it("should assign available offices to waiting appointments", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
        new Appointment(
          new IdCard(222222222),
          new FullName("Patient Two"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1", "2", "3", "4", "5"]);

      await useCase.execute();

      // Both appointments should be saved (assigned to offices)
      expect(mockRepository.saveCalls).toHaveLength(2);

      // Both should now be in 'called' status
      expect(mockRepository.saveCalls[0].status).toBe("called");
      expect(mockRepository.saveCalls[1].status).toBe("called");

      // Each should have an office assigned
      expect(mockRepository.saveCalls[0].office).toBe("1");
      expect(mockRepository.saveCalls[1].office).toBe("2");
    });

    it("should log assignment process", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1", "2", "3"]);

      await useCase.execute();

      expect(mockLogger.hasLog("INICIO ASIGNACIÓN")).toBe(true);
      expect(mockLogger.hasLog("Oficinas totales")).toBe(true);
      expect(mockLogger.hasLog("Oficinas libres detectadas")).toBe(true);
      expect(mockLogger.hasLog("FIN ASIGNACIÓN")).toBe(true);
    });

    it("should skip when no free offices available", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult([]); // No free offices

      await useCase.execute();

      // No assignments should happen
      expect(mockRepository.saveCalls).toHaveLength(0);
      expect(mockLogger.hasLog("No hay oficinas libres")).toBe(true);
    });

    it("should skip when no waiting appointments exist", async () => {
      mockRepository.setFindWaitingResult([]);
      mockRepository.setFindAvailableOfficesResult(["1", "2", "3"]);

      await useCase.execute();

      // No assignments should happen
      expect(mockRepository.saveCalls).toHaveLength(0);
      expect(mockLogger.hasLog("No hay turnos en espera")).toBe(true);
    });

    it("should respect priority order when assigning offices", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Low Priority"),
          new Priority("low"),
          "waiting",
          null,
          1000000,
        ),
        new Appointment(
          new IdCard(222222222),
          new FullName("High Priority"),
          new Priority("high"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1", "2"]);

      await useCase.execute();

      // High priority should be assigned first office
      expect(mockRepository.saveCalls[0].idCard.toValue()).toBe(222222222);
      expect(mockRepository.saveCalls[0].office).toBe("1");

      // Low priority should be assigned second office
      expect(mockRepository.saveCalls[1].idCard.toValue()).toBe(111111111);
      expect(mockRepository.saveCalls[1].office).toBe("2");
    });

    it("should respect FIFO order within same priority", async () => {
      const timestamp1 = 1000000;
      const timestamp2 = 2000000;

      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("medium"),
          "waiting",
          null,
          timestamp1, // Earlier
        ),
        new Appointment(
          new IdCard(222222222),
          new FullName("Patient Two"),
          new Priority("medium"),
          "waiting",
          null,
          timestamp2, // Later
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1", "2"]);

      await useCase.execute();

      // Earlier appointment should be assigned first
      expect(mockRepository.saveCalls[0].idCard.toValue()).toBe(111111111);
      expect(mockRepository.saveCalls[0].office).toBe("1");

      expect(mockRepository.saveCalls[1].idCard.toValue()).toBe(222222222);
      expect(mockRepository.saveCalls[1].office).toBe("2");
    });

    it("should use ConsultationPolicy for random duration", async () => {
      // ConsultationPolicy uses randomFn to calculate duration between 8-15 seconds
      // Formula: Math.floor(randomFn() * (15 - 8 + 1)) + 8
      // Set to 1.0 for max duration: Math.floor(1.0 * 8) + 8 = 8 + 8 = 16 seconds
      deterministicRandom = 1.0;
      const expectedDurationSeconds = 16; // Math.floor(1.0 * 8) + 8 = 16

      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1", "2"]);

      await useCase.execute();

      const assigned = mockRepository.saveCalls[0];
      // completedAt should be timestamp + (duration * 1000ms)
      expect(assigned.completedAt).toBe(
        1000000 + expectedDurationSeconds * 1000,
      );
    });

    it("should record AppointmentAssignedEvent", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1"]);

      await useCase.execute();

      const assigned = mockRepository.saveCalls[0];
      const events = assigned.pullEvents();
      expect(events).toHaveLength(1);
      expect(events[0].constructor.name).toBe("AppointmentAssignedEvent");
    });

    it("should limit assignments to min(freeOffices, waiting)", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("P1"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
        new Appointment(
          new IdCard(222222222),
          new FullName("P2"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
        new Appointment(
          new IdCard(333333333),
          new FullName("P3"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1", "2"]); // Only 2 free offices

      await useCase.execute();

      // Only 2 should be assigned (min of 3 waiting and 2 free)
      expect(mockRepository.saveCalls).toHaveLength(2);
    });

    it("should handle repository errors gracefully", async () => {
      mockRepository.setThrowOnFindAvailableOffices(true);

      await expect(useCase.execute()).rejects.toThrow();
    });

    it("should handle save errors during assignment", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Patient One"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1"]);
      mockRepository.setThrowOnSave(true);

      await expect(useCase.execute()).rejects.toThrow();
    });

    it("should generate correct office list for total offices", async () => {
      mockRepository.setFindAvailableOfficesResult([]);
      mockRepository.setFindWaitingResult([]);

      await useCase.execute();

      // Should log all 5 offices
      expect(mockLogger.hasLog("1, 2, 3, 4, 5")).toBe(true);
    });
  });

  describe("complex scenarios", () => {
    it("should handle mixed priority levels with correct ordering", async () => {
      const waiting = [
        new Appointment(
          new IdCard(111111111),
          new FullName("Low 1"),
          new Priority("low"),
          "waiting",
          null,
          1000000,
        ),
        new Appointment(
          new IdCard(222222222),
          new FullName("Medium 1"),
          new Priority("medium"),
          "waiting",
          null,
          1000000,
        ),
        new Appointment(
          new IdCard(333333333),
          new FullName("High 1"),
          new Priority("high"),
          "waiting",
          null,
          1000000,
        ),
        new Appointment(
          new IdCard(444444444),
          new FullName("High 2"),
          new Priority("high"),
          "waiting",
          null,
          2000000,
        ),
      ];

      mockRepository.setFindWaitingResult(waiting);
      mockRepository.setFindAvailableOfficesResult(["1", "2", "3", "4"]);

      await useCase.execute();

      // Order should be: High 1, High 2, Medium 1, Low 1
      expect(mockRepository.saveCalls[0].idCard.toValue()).toBe(333333333);
      expect(mockRepository.saveCalls[1].idCard.toValue()).toBe(444444444);
      expect(mockRepository.saveCalls[2].idCard.toValue()).toBe(222222222);
      expect(mockRepository.saveCalls[3].idCard.toValue()).toBe(111111111);
    });
  });
});
