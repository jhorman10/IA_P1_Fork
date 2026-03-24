/**
 * appointment.module.ts — module wiring coverage.
 * HUMAN CHECK: Verifies the module class is defined and imports compile correctly.
 */

// @nestjs/mongoose.forFeature just returns a DynamicModule descriptor — safe to call.
jest.mock("@nestjs/mongoose", () => {
  const actual = jest.requireActual("@nestjs/mongoose");
  return {
    ...actual,
    MongooseModule: {
      ...actual.MongooseModule,
      forFeature: jest.fn().mockReturnValue({ module: class MongooseFeatureModule {} }),
    },
  };
});

import { AppointmentModule } from "../../../src/appointments/appointment.module";

describe("AppointmentModule", () => {
  it("should be defined", () => {
    expect(AppointmentModule).toBeDefined();
  });

  it("should be a class (constructor function)", () => {
    expect(typeof AppointmentModule).toBe("function");
  });

  it("should be instantiable", () => {
    expect(() => new AppointmentModule()).not.toThrow();
  });
});
