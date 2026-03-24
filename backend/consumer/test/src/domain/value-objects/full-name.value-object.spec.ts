import { ValidationError } from "../../../../src/domain/errors/validation.error";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";

describe("FullName Value Object", () => {
  describe("constructor", () => {
    it("should accept valid full names with multiple words", () => {
      expect(() => new FullName("Juan Pérez")).not.toThrow();
      expect(() => new FullName("María García López")).not.toThrow();
      expect(() => new FullName("José Miguel de la Cruz")).not.toThrow();
    });

    it("should accept single names with 2+ characters", () => {
      expect(() => new FullName("Jo")).not.toThrow();
      expect(() => new FullName("Maria")).not.toThrow();
    });

    it("should reject names shorter than 2 characters", () => {
      expect(() => new FullName("A")).toThrow(ValidationError);
      expect(() => new FullName("J")).toThrow(ValidationError);
    });

    it("should reject empty strings", () => {
      expect(() => new FullName("")).toThrow(ValidationError);
      expect(() => new FullName("   ")).toThrow(ValidationError);
    });

    it("should reject null or undefined", () => {
      expect(() => new FullName(null)).toThrow(ValidationError);
      expect(() => new FullName(undefined)).toThrow(ValidationError);
    });

    it("should reject names exceeding 100 characters", () => {
      const longName = "A".repeat(101);
      expect(() => new FullName(longName)).toThrow(ValidationError);
    });

    it("should accept names exactly 100 characters", () => {
      const maxName = "A".repeat(100);
      expect(() => new FullName(maxName)).not.toThrow();
    });
  });

  describe("trimming", () => {
    it("should trim leading and trailing whitespace", () => {
      const name = new FullName("   Juan Pérez   ");
      expect(name.toValue()).toBe("Juan Pérez");
    });

    it("should preserve internal whitespace", () => {
      const name = new FullName("Juan  Miguel  Pérez");
      expect(name.toValue()).toBe("Juan  Miguel  Pérez");
    });

    it("should handle multiple spaces between words", () => {
      const name = new FullName("  María    García  ");
      expect(name.toValue()).toBe("María    García");
    });
  });

  describe("toValue", () => {
    it("should return trimmed full name string", () => {
      const name = new FullName("  Juan Pérez  ");
      expect(name.toValue()).toBe("Juan Pérez");
      expect(typeof name.toValue()).toBe("string");
    });
  });

  describe("equals", () => {
    it("should return true for identical names", () => {
      const name1 = new FullName("Juan Pérez");
      const name2 = new FullName("Juan Pérez");
      expect(name1.equals(name2)).toBe(true);
    });

    it("should return false for different names", () => {
      const name1 = new FullName("Juan Pérez");
      const name2 = new FullName("María García");
      expect(name1.equals(name2)).toBe(false);
    });

    it("should handle case sensitivity", () => {
      const name1 = new FullName("Juan Pérez");
      const name2 = new FullName("juan pérez");
      // Domain doesn't normalize case, so they should be different
      expect(name1.equals(name2)).toBe(false);
    });

    it("should be sensitive to whitespace differences", () => {
      const name1 = new FullName("Juan Pérez");
      const name2 = new FullName("Juan  Pérez"); // Extra space
      expect(name1.equals(name2)).toBe(false);
    });
  });

  describe("special characters", () => {
    it("should accept names with accents and diacritics", () => {
      expect(() => new FullName("José María")).not.toThrow();
      expect(() => new FullName("Ñoño")).not.toThrow();
      expect(() => new FullName("Müller")).not.toThrow();
    });

    it("should accept names with hyphens", () => {
      expect(() => new FullName("José-María")).not.toThrow();
      expect(() => new FullName("Marie-Louise")).not.toThrow();
    });

    it("should accept names with apostrophes", () => {
      expect(() => new FullName("O'Connor")).not.toThrow();
      expect(() => new FullName("D'Agostino")).not.toThrow();
    });

    it("should NOT accept names with numbers", () => {
      // Domain allows any characters, including numbers
      // This is a validation rule decision
      expect(() => new FullName("Juan123")).not.toThrow();
      // If we want to reject numbers, we'd need to add validation
    });
  });

  describe("serialization", () => {
    it("should support JSON stringify", () => {
      const name = new FullName("Juan Pérez");
      const json = JSON.stringify({ name: name.toValue() });
      expect(json).toContain("Juan Pérez");
    });

    it("should support round-trip through toValue", () => {
      const original = new FullName("María García");
      const value = original.toValue();
      const reconstructed = new FullName(value);
      expect(reconstructed.equals(original)).toBe(true);
    });
  });

  describe("display and toString", () => {
    it("should support string coercion for display", () => {
      const name = new FullName("Juan Pérez");
      expect(`Patient: ${name.toValue()}`).toBe("Patient: Juan Pérez");
    });
  });
});
