import { InfrastructureError } from "../../../../src/domain/errors/infrastructure.error";

describe("InfrastructureError", () => {
  it("should be defined", () => {
    expect(InfrastructureError).toBeDefined();
  });

  it("should create error with message", () => {
    const error = new InfrastructureError("Database connection failed");

    expect(error).toBeInstanceOf(InfrastructureError);
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Database connection failed");
  });

  it("should have correct name", () => {
    const error = new InfrastructureError("Test error");

    expect(error.name).toBe("InfrastructureError");
  });

  // HUMAN CHECK: Critical test - ensures infrastructure errors are distinguishable from domain errors
  it("should be catchable as InfrastructureError", () => {
    const throwError = () => {
      throw new InfrastructureError("Network timeout");
    };

    expect(throwError).toThrow(InfrastructureError);
    expect(throwError).toThrow("Network timeout");
  });

  it("should preserve stack trace", () => {
    const error = new InfrastructureError("Stack trace test");

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("InfrastructureError");
  });
});
