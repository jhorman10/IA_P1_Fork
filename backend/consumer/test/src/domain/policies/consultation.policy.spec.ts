import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { ConsultationPolicy } from "../../../../src/domain/policies/consultation.policy";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";

/**
 * ⚕️ HUMAN CHECK - Verificación de Testabilidad:
 * RNG inyectable permite tests determinísticos.
 * Sin dependencia de Math.random() en la ejecución de tests.
 */
describe("ConsultationPolicy", () => {
  let policy: ConsultationPolicy;

  beforeEach(() => {
    policy = new ConsultationPolicy();
  });

  describe("Instance-based (injectable RNG)", () => {
    it("should return MIN_DURATION when random returns 0", () => {
      const deterministicPolicy = new ConsultationPolicy(() => 0);
      expect(deterministicPolicy.getRandomDurationSeconds()).toBe(60);
    });

    it("should return MAX_DURATION when random returns 0.99", () => {
      const deterministicPolicy = new ConsultationPolicy(() => 0.99);
      expect(deterministicPolicy.getRandomDurationSeconds()).toBe(120);
    });

    it("should return midpoint when random returns 0.5", () => {
      const deterministicPolicy = new ConsultationPolicy(() => 0.5);
      const result = deterministicPolicy.getRandomDurationSeconds();
      expect(result).toBeGreaterThanOrEqual(60);
      expect(result).toBeLessThanOrEqual(120);
      expect(result).toBe(90); // floor(0.5 * 61) + 60 = 90
    });

    it("should always produce values within [60, 120] range for valid random [0, 1)", () => {
      // Math.random() returns [0, 1) — 1.0 is never produced
      for (let i = 0; i < 100; i++) {
        const randomValue = i / 100;
        const deterministicPolicy = new ConsultationPolicy(() => randomValue);
        const duration = deterministicPolicy.getRandomDurationSeconds();
        expect(duration).toBeGreaterThanOrEqual(60);
        expect(duration).toBeLessThanOrEqual(120);
      }
    });
  });

  describe("Static convenience method (backward compatibility)", () => {
    it("should return a value within [60, 120] range", () => {
      const result = ConsultationPolicy.getRandomDurationSeconds();
      expect(result).toBeGreaterThanOrEqual(60);
      expect(result).toBeLessThanOrEqual(120);
    });

    it("should return an integer", () => {
      const result = ConsultationPolicy.getRandomDurationSeconds();
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe("findAvailableOffices", () => {
    it("should return all offices when none are occupied", () => {
      const allOffices = ["C1", "C2", "C3", "C4"];
      const occupied: Appointment[] = [];

      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual(allOffices);
    });

    it("should exclude offices with called appointments", () => {
      const allOffices = ["C1", "C2", "C3", "C4"];

      // Create a mock appointment with called status and office
      const occupiedAppointment = {
        status: "called",
        office: "C1",
      } as unknown as Appointment;

      const available = policy.findAvailableOffices(allOffices, [
        occupiedAppointment,
      ]);
      expect(available).toEqual(["C2", "C3", "C4"]);
      expect(available).not.toContain("C1");
    });

    it("should handle multiple occupied offices", () => {
      const allOffices = ["C1", "C2", "C3", "C4", "C5"];
      const occupied = [
        { status: "called", office: "C2" } as unknown as Appointment,
        { status: "called", office: "C4" } as unknown as Appointment,
      ];

      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available.sort()).toEqual(["C1", "C3", "C5"]);
    });

    it("should return empty array when all offices occupied", () => {
      const allOffices = ["C1", "C2"];
      const occupied = [
        { status: "called", office: "C1" } as unknown as Appointment,
        { status: "called", office: "C2" } as unknown as Appointment,
      ];

      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual([]);
    });

    it("should ignore waiting appointments when determining availability", () => {
      const allOffices = ["C1", "C2", "C3"];
      const occupied = [
        { status: "waiting" } as unknown as Appointment, // Should not occupy office
        { status: "called", office: "C1" } as unknown as Appointment, // Should occupy
      ];

      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual(["C2", "C3"]);
    });

    it("should ignore appointments with null/undefined office", () => {
      const allOffices = ["C1", "C2", "C3"];
      const occupied = [
        { status: "called", office: null } as unknown as Appointment,
        { status: "called", office: undefined } as unknown as Appointment,
      ];

      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual(allOffices);
    });

    it("should preserve office order from input", () => {
      const allOffices = ["C5", "C3", "C1", "C4", "C2"];
      const occupied = [
        { status: "called", office: "C2" } as unknown as Appointment,
        { status: "called", office: "C4" } as unknown as Appointment,
      ];

      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual(["C5", "C3", "C1"]); // Preserves input order
    });
  });

  describe("canAssign", () => {
    it("should allow assignment to waiting appointments with no office", () => {
      const appointment = {
        status: "waiting",
        office: undefined,
      } as unknown as Appointment;

      expect(policy.canAssign(appointment)).toBe(true);
    });

    it("should allow assignment to waiting appointments with null office", () => {
      const appointment = {
        status: "waiting",
        office: null,
      } as unknown as Appointment;

      expect(policy.canAssign(appointment)).toBe(true);
    });

    it("should reject called appointments", () => {
      const appointment = {
        status: "called",
        office: "C1",
      } as unknown as Appointment;

      expect(policy.canAssign(appointment)).toBe(false);
    });

    it("should reject completed appointments", () => {
      const appointment = {
        status: "completed",
        office: "C1",
      } as unknown as Appointment;

      expect(policy.canAssign(appointment)).toBe(false);
    });

    it("should reject waiting appointments that already have an office", () => {
      const appointment = {
        status: "waiting",
        office: "C1",
      } as unknown as Appointment;

      expect(policy.canAssign(appointment)).toBe(false);
    });

    it("should accept any waiting appointment without office regardless of other properties", () => {
      const appointment = {
        status: "waiting",
        office: undefined,
        idCard: new IdCard(123456789),
        fullName: new FullName("Test Patient"),
        priority: new Priority("high"),
      } as unknown as Appointment;

      expect(policy.canAssign(appointment)).toBe(true);
    });
  });

  describe("isOfficeEligible", () => {
    it("should accept offices in available list", () => {
      const office = "C1";
      const available = ["C1", "C2", "C3"];

      expect(policy.isOfficeEligible(office, available)).toBe(true);
    });

    it("should reject offices not in available list", () => {
      const office = "C5";
      const available = ["C1", "C2", "C3"];

      expect(policy.isOfficeEligible(office, available)).toBe(false);
    });

    it("should reject empty office identifiers", () => {
      const available = ["C1", "C2", "C3"];
      expect(policy.isOfficeEligible("", available)).toBe(false);
    });

    it("should require office to be in available list AND non-empty", () => {
      const available = ["C1", "C2"];
      expect(policy.isOfficeEligible("C1", available)).toBe(true);
      expect(policy.isOfficeEligible("C3", available)).toBe(false);
      expect(policy.isOfficeEligible("", available)).toBe(false);
    });

    it("should be case-sensitive when matching office IDs", () => {
      const available = ["C1", "C2", "C3"];
      expect(policy.isOfficeEligible("c1", available)).toBe(false); // lowercase mismatch
      expect(policy.isOfficeEligible("C1", available)).toBe(true);
    });

    it("should handle offices with special characters in ID", () => {
      const available = ["C-1", "C_2", "C.3"];
      expect(policy.isOfficeEligible("C-1", available)).toBe(true);
      expect(policy.isOfficeEligible("C_2", available)).toBe(true);
      expect(policy.isOfficeEligible("C.3", available)).toBe(true);
    });

    it("should return false when available list is empty", () => {
      const available: string[] = [];
      expect(policy.isOfficeEligible("C1", available)).toBe(false);
    });
  });

  describe("integration scenarios", () => {
    it("should coordinate findAvailableOffices and canAssign to enable office assignment workflow", () => {
      const allOffices = ["C1", "C2", "C3"];
      const occupied = [
        { status: "called", office: "C1" } as unknown as Appointment,
      ];
      const appointment = {
        status: "waiting",
        office: undefined,
      } as unknown as Appointment;

      // Find available
      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual(["C2", "C3"]);

      // Check if assignable
      expect(policy.canAssign(appointment)).toBe(true);

      // Verify office eligibility
      expect(policy.isOfficeEligible("C2", available)).toBe(true);
      expect(policy.isOfficeEligible("C1", available)).toBe(false);
    });

    it("should prevent assignment when no offices available", () => {
      const allOffices = ["C1", "C2"];
      const occupied = [
        { status: "called", office: "C1" } as unknown as Appointment,
        { status: "called", office: "C2" } as unknown as Appointment,
      ];
      const appointment = {
        status: "waiting",
        office: undefined,
      } as unknown as Appointment;

      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual([]);
      expect(policy.canAssign(appointment)).toBe(true);
      // But no eligible office exists for assignment
    });

    it("should complete full assignment workflow", () => {
      const allOffices = ["C1", "C2", "C3"];
      const occupied = [
        { status: "called", office: "C2" } as unknown as Appointment,
      ];
      const appointment = {
        status: "waiting",
        office: undefined,
      } as unknown as Appointment;

      // Step 1: Check if assignable
      const canAssign = policy.canAssign(appointment);
      expect(canAssign).toBe(true);

      // Step 2: Get available offices
      const available = policy.findAvailableOffices(allOffices, occupied);
      expect(available).toEqual(["C1", "C3"]);

      // Step 3: Pick office from available
      const selectedOffice = available[0]; // 'C1'
      expect(policy.isOfficeEligible(selectedOffice, available)).toBe(true);

      // Step 4: Assignment would now proceed with selectedOffice
      expect(selectedOffice).toBe("C1");
    });
  });
});
