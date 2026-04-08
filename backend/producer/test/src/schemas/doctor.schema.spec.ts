import { DoctorSchema } from "src/schemas/doctor.schema";

describe("DoctorSchema", () => {
  it("should configure office as nullable with default null", () => {
    const officePath = DoctorSchema.path("office") as any;

    expect(officePath).toBeDefined();
    expect(officePath.options.required).toBe(false);
    expect(officePath.options.default).toBeNull();
  });

  it("should register unique sparse index for office", () => {
    const indexes = DoctorSchema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ office: 1 }, expect.objectContaining({ unique: true, sparse: true })],
      ]),
    );
  });
});