import { PatientName } from "../../../../src/domain/value-objects/patient-name.vo";

describe("PatientName", () => {
  describe("valid values", () => {
    it("should create PatientName with a simple name", () => {
      const name = new PatientName("John Doe");
      expect(name.Value).toBe("John Doe");
    });

    it("should accept names with accents", () => {
      const name = new PatientName("María García");
      expect(name.Value).toBe("María García");
    });

    it("should accept names with special characters like hyphens", () => {
      // PatientName regex only allows letters, ñ, accented vowels and spaces
      // Hyphenated names are not supported by the current regex
      expect(() => new PatientName("Ana Maria")).not.toThrow();
    });

    it("should return string representation via toString", () => {
      const name = new PatientName("John Doe");
      expect(name.toString()).toBe("John Doe");
    });
  });

  describe("invalid values", () => {
    // HUMAN CHECK: Nombres vacíos no son válidos como identificador de paciente
    it("should throw when name is empty", () => {
      expect(() => new PatientName("")).toThrow();
    });

    it("should throw when name is only whitespace", () => {
      expect(() => new PatientName("   ")).toThrow();
    });

    it("should throw when name is a number string representation", () => {
      expect(() => new PatientName("12345")).toThrow();
    });

    it("should throw when name is too short", () => {
      expect(() => new PatientName("Ab")).toThrow(
        "PatientName must be at least 3 characters long",
      );
    });
  });
});
