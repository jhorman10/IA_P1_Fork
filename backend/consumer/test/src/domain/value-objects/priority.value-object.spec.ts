import { ValidationError } from "../../../../src/domain/errors/validation.error";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";

describe("Priority Value Object", () => {
  describe("constructor", () => {
    it("should accept valid priority values", () => {
      const validPriorities = ["high", "medium", "low"];
      validPriorities.forEach((priority) => {
        expect(() => new Priority(priority)).not.toThrow();
      });
    });

    it("should accept valid priority values case-insensitively", () => {
      expect(() => new Priority("HIGH")).not.toThrow();
      expect(() => new Priority("MEDIUM")).not.toThrow();
      expect(() => new Priority("Low")).not.toThrow();
    });

    it("should reject invalid priority values", () => {
      expect(() => new Priority("invalid")).toThrow(ValidationError);
      expect(() => new Priority("urgent")).toThrow(ValidationError);
      expect(() => new Priority("critical")).toThrow(ValidationError);
    });

    it("should reject null or undefined with default fallback", () => {
      expect(() => new Priority(null)).toThrow(ValidationError);
      expect(() => new Priority(undefined)).toThrow(ValidationError);
    });

    it("should reject empty strings", () => {
      expect(() => new Priority("")).toThrow(ValidationError);
      expect(() => new Priority("   ")).toThrow(ValidationError);
    });
  });

  describe("toValue", () => {
    it("should return proper priority level", () => {
      expect(new Priority("high").toValue()).toBe("high");
      expect(new Priority("medium").toValue()).toBe("medium");
      expect(new Priority("low").toValue()).toBe("low");
    });

    it("should normalize to lowercase", () => {
      expect(new Priority("HIGH").toValue()).toBe("high");
      expect(new Priority("MeDiUm").toValue()).toBe("medium");
    });
  });

  describe("equals", () => {
    it("should return true for equal priorities", () => {
      const p1 = new Priority("high");
      const p2 = new Priority("HIGH");
      expect(p1.equals(p2)).toBe(true);
    });

    it("should return false for different priorities", () => {
      const p1 = new Priority("high");
      const p2 = new Priority("low");
      expect(p1.equals(p2)).toBe(false);
    });
  });

  describe("getNumericWeight", () => {
    it("should return correct weight for each priority", () => {
      expect(new Priority("high").getNumericWeight()).toBe(1);
      expect(new Priority("medium").getNumericWeight()).toBe(2);
      expect(new Priority("low").getNumericWeight()).toBe(3);
    });

    it("should enable numeric comparison for sorting", () => {
      const high = new Priority("high");
      const medium = new Priority("medium");
      const low = new Priority("low");

      expect(high.getNumericWeight()).toBeLessThan(medium.getNumericWeight());
      expect(medium.getNumericWeight()).toBeLessThan(low.getNumericWeight());
    });
  });

  describe("serialization", () => {
    it("should support JSON stringify", () => {
      const priority = new Priority("high");
      const json = JSON.stringify({ priority: priority.toValue() });
      expect(json).toContain("high");
    });

    it("should support round-trip through toValue", () => {
      const original = new Priority("medium");
      const value = original.toValue();
      const reconstructed = new Priority(value);
      expect(reconstructed.equals(original)).toBe(true);
    });
  });
});
