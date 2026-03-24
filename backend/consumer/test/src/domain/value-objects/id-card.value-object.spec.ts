import { ValidationError } from "../../../../src/domain/errors/validation.error";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";

describe("IdCard Value Object", () => {
  it("should create a valid IdCard from a 6-digit number", () => {
    const idCard = new IdCard(100000);
    expect(idCard.toValue()).toBe(100000);
  });

  it("should create a valid IdCard from a 12-digit number", () => {
    const idCard = new IdCard(999999999999);
    expect(idCard.toValue()).toBe(999999999999);
  });

  it("should create a valid IdCard from a numeric string (6+ digits)", () => {
    const idCard = new IdCard("789012");
    expect(idCard.toValue()).toBe(789012);
  });

  it("should create a valid IdCard from a large number string", () => {
    const idCard = new IdCard("123456789");
    expect(idCard.toValue()).toBe(123456789);
  });

  it("should throw ValidationError for numbers with < 6 digits", () => {
    expect(() => new IdCard(99999)).toThrow(ValidationError);
    expect(() => new IdCard(1000)).toThrow(ValidationError);
    expect(() => new IdCard(10)).toThrow(ValidationError);
  });

  it("should throw ValidationError for non-numeric strings that cannot be converted", () => {
    expect(() => new IdCard("abc")).toThrow(ValidationError);
    expect(() => new IdCard("not-a-number")).toThrow(ValidationError);
  });

  it("should throw ValidationError for negative numbers", () => {
    expect(() => new IdCard(-123456)).toThrow(ValidationError);
  });

  it("should throw ValidationError for zero", () => {
    expect(() => new IdCard(0)).toThrow(ValidationError);
  });

  it("should throw ValidationError for numbers exceeding 12 digits", () => {
    expect(() => new IdCard(9999999999999)).toThrow(ValidationError);
  });

  it("should implement equality check", () => {
    const id1 = new IdCard(123456);
    const id2 = new IdCard(123456);
    const id3 = new IdCard(987654);

    expect(id1.equals(id2)).toBe(true);
    expect(id1.equals(id3)).toBe(false);
  });

  describe("fromJSON deserialization", () => {
    it("should safely deserialize valid JSON numbers", () => {
      const idCard = IdCard.fromJSON(123456789);
      expect(idCard.toValue()).toBe(123456789);
    });

    it("should safely deserialize valid JSON strings", () => {
      const idCard = IdCard.fromJSON("987654321");
      expect(idCard.toValue()).toBe(987654321);
    });

    it("should throw on invalid IdCard (too small) from fromJSON", () => {
      expect(() => IdCard.fromJSON(123)).toThrow();
      expect(() => IdCard.fromJSON("99")).toThrow();
    });

    it("should throw on invalid IdCard (too large) from fromJSON", () => {
      expect(() => IdCard.fromJSON(9999999999999)).toThrow();
    });

    it("should throw on malformed input", () => {
      expect(() => IdCard.fromJSON("not-a-number")).toThrow();
      expect(() => IdCard.fromJSON({})).toThrow();
      expect(() => IdCard.fromJSON([])).toThrow();
    });

    it("should handle boundary cases for fromJSON", () => {
      // Minimum valid: 6 digits (100000)
      expect(() => IdCard.fromJSON(100000)).not.toThrow();

      // Maximum valid: 12 digits (999999999999)
      expect(() => IdCard.fromJSON(999999999999)).not.toThrow();

      // Just below minimum
      expect(() => IdCard.fromJSON(99999)).toThrow();
    });
  });

  describe("toString", () => {
    it("should return string representation of IdCard", () => {
      const idCard = new IdCard(123456789);
      expect(idCard.toString()).toBe("123456789");
      expect(typeof idCard.toString()).toBe("string");
    });

    it("should work with minimum valid IdCard", () => {
      const idCard = new IdCard(100000);
      expect(idCard.toString()).toBe("100000");
    });

    it("should work with maximum valid IdCard", () => {
      const idCard = new IdCard(999999999999);
      expect(idCard.toString()).toBe("999999999999");
    });
  });

  describe("type safety", () => {
    it("should maintain identity across multiple constructions", () => {
      const id1 = new IdCard(123456789);
      const id2 = new IdCard(123456789);

      // Same value should be equal
      expect(id1.equals(id2)).toBe(true);

      // Should maintain type identity
      expect(id1.toValue()).toBe(id2.toValue());
    });

    it("should preserve numeric precision", () => {
      // Test with a valid 12-digit number
      const validValue = 999999999999;
      const idCard = new IdCard(validValue);
      expect(idCard.toValue()).toBe(validValue);

      // This exceeds 12 digits (13 digits), so will throw
      const tooLargeValue = 9999999999999;
      expect(() => new IdCard(tooLargeValue)).toThrow();
    });
  });
});
