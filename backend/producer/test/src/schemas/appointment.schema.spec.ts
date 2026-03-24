import { SchemaFactory } from "@nestjs/mongoose";

import { Appointment } from "../../../src/schemas/appointment.schema";

describe("AppointmentSchema", () => {
  it("should be defined", () => {
    expect(Appointment).toBeDefined();
  });

  it("should create a valid schema using SchemaFactory", () => {
    const schema = SchemaFactory.createForClass(Appointment);
    expect(schema).toBeDefined();
  });

  it("should export AppointmentSchema constant", async () => {
    const { AppointmentSchema } =
      await import("../../../src/schemas/appointment.schema");
    expect(AppointmentSchema).toBeDefined();
  });

  it("should have idCard field defined in schema paths", () => {
    const schema = SchemaFactory.createForClass(Appointment);
    expect(schema.path("idCard")).toBeDefined();
  });

  it("should have fullName field defined in schema paths", () => {
    const schema = SchemaFactory.createForClass(Appointment);
    expect(schema.path("fullName")).toBeDefined();
  });

  it("should have status field with enum values", () => {
    const schema = SchemaFactory.createForClass(Appointment);
    const statusPath = schema.path("status") as any;
    expect(statusPath).toBeDefined();
    expect(statusPath.options.enum).toEqual(["waiting", "called", "completed"]);
  });

  it("should have priority field with enum values", () => {
    const schema = SchemaFactory.createForClass(Appointment);
    const priorityPath = schema.path("priority") as any;
    expect(priorityPath).toBeDefined();
    expect(priorityPath.options.enum).toEqual(["high", "medium", "low"]);
  });

  it("should have office field nullable", () => {
    const schema = SchemaFactory.createForClass(Appointment);
    const officePath = schema.path("office") as any;
    expect(officePath).toBeDefined();
    expect(officePath.options.default).toBeNull();
  });

  // HUMAN CHECK: completedAt debe ser nullable para turnos pendientes y en llamado
  it("should have completedAt field nullable", () => {
    const schema = SchemaFactory.createForClass(Appointment);
    const completedAtPath = schema.path("completedAt") as any;
    expect(completedAtPath).toBeDefined();
    expect(completedAtPath.options.default).toBeNull();
  });
});
