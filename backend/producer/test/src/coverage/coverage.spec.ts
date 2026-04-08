import mongoose from "mongoose";
import { ProducerController } from "src/producer.controller";
import { AppointmentSchema } from "src/schemas/appointment.schema";

describe("Coverage guardrails", () => {
  describe("ProducerController", () => {
    it("uses provided priority", async () => {
      const createUseCase = { execute: jest.fn() } as any;
      const queryUseCase = { execute: jest.fn() } as any;
      const controller = new ProducerController(createUseCase, queryUseCase);

      await controller.createAppointment({
        idCard: 1,
        fullName: "John",
        priority: "high",
      } as any);

      expect(createUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ priority: "high" }),
      );
    });

    it("passes undefined priority as-is when validation is bypassed", async () => {
      const createUseCase = { execute: jest.fn() } as any;
      const queryUseCase = { execute: jest.fn() } as any;
      const controller = new ProducerController(createUseCase, queryUseCase);

      await controller.createAppointment({
        idCard: 2,
        fullName: "Jane",
      } as any);

      expect(createUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ priority: undefined }),
      );
    });
    it("passes null priority as-is when validation is bypassed", async () => {
      const createUseCase = { execute: jest.fn() } as any;
      const queryUseCase = { execute: jest.fn() } as any;
      const controller = new ProducerController(createUseCase, queryUseCase);

      await controller.createAppointment({
        idCard: 3,
        fullName: "Null",
        priority: null,
      } as any);

      expect(createUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ priority: null }),
      );
    });
  });

  describe("AppointmentSchema", () => {
    it("applies defaults for status and timestamps", () => {
      const Model = mongoose.model("AppointmentTest", AppointmentSchema);
      const doc = new Model({ idCard: 10, fullName: "Alice" });

      expect(doc.status).toBe("waiting");
      expect(doc.priority).toBe("medium");
      expect(doc.timestamp).toBeDefined();
      expect(doc.completedAt).toBeNull();

      mongoose.deleteModel("AppointmentTest");
    });
  });
});
