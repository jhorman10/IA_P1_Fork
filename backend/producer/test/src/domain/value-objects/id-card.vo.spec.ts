import { IdCard } from "../../../../src/domain/value-objects/id-card.vo";

describe("IdCard", () => {
  describe("valid values", () => {
    it("should create IdCard with a valid 7-digit number", () => {
      const idCard = new IdCard(1234567);
      expect(idCard.Value).toBe(1234567);
    });

    it("should create IdCard with 6-digit minimum", () => {
      const idCard = new IdCard(100000);
      expect(idCard.Value).toBe(100000);
    });

    it("should create IdCard with 12-digit maximum", () => {
      const idCard = new IdCard(123456789012);
      expect(idCard.Value).toBe(123456789012);
    });

    it("should return string representation via toString", () => {
      const idCard = new IdCard(1234567);
      expect(idCard.toString()).toBe("1234567");
    });
  });

  describe("invalid values — non-integer", () => {
    it("should throw when value is a float", () => {
      expect(() => new IdCard(1234567.5)).toThrow("IdCard must be an integer");
    });

    it("should throw when value is NaN", () => {
      expect(() => new IdCard(NaN)).toThrow("IdCard must be an integer");
    });
  });

  describe("invalid values — non-positive", () => {
    // HUMAN CHECK: Cédulas negativas o cero no son válidas como identificador
    it("should throw when value is zero", () => {
      expect(() => new IdCard(0)).toThrow("IdCard must be a positive number");
    });

    it("should throw when value is negative", () => {
      expect(() => new IdCard(-1234567)).toThrow(
        "IdCard must be a positive number",
      );
    });
  });

  describe("invalid values — length out of range", () => {
    it("should throw when value has fewer than 6 digits", () => {
      expect(() => new IdCard(12345)).toThrow(
        "IdCard must be between 6 and 12 digits",
      );
    });

    it("should throw when value has more than 12 digits", () => {
      expect(() => new IdCard(1234567890123)).toThrow(
        "IdCard must be between 6 and 12 digits",
      );
    });
  });
});
