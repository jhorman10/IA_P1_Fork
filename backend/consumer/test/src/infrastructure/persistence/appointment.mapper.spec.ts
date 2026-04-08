import { Types } from "mongoose";

import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";
import { AppointmentMapper } from "../../../../src/infrastructure/persistence/appointment.mapper";
import { PersistenceAppointmentData } from "../../../../src/infrastructure/persistence/persistence-appointment.interface";

/**
 * ⚕️ HUMAN CHECK - Verificación de Type Safety:
 * Sin tipos 'any'. toPersistence retorna PersistenceAppointmentData.
 */
describe("AppointmentMapper", () => {
  const now = Date.now();

  describe("toPersistence", () => {
    it("should map a domain entity to PersistenceAppointmentData", () => {
      const entity = new Appointment(
        new IdCard(12345678),
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
        null,
        now,
        undefined,
        "entity-id",
      );

      const result: PersistenceAppointmentData =
        AppointmentMapper.toPersistence(entity);

      expect(result).toEqual({
        idCard: 12345678,
        fullName: "John Doe",
        priority: "high",
        status: "waiting",
        office: null,
        timestamp: now,
        completedAt: undefined,
        doctorId: null,
        doctorName: null,
        domainId: "entity-id",
      });
    });

    it("should include office and completedAt when present", () => {
      const entity = new Appointment(
        new IdCard(123456789),
        new FullName("Jane Smith"),
        new Priority("low"),
        "called",
        "3",
        now,
        now + 10000,
        "entity-id",
      );

      const result = AppointmentMapper.toPersistence(entity);

      expect(result.office).toBe("3");
      expect(result.status).toBe("called");
      expect(result.completedAt).toBe(now + 10000);
    });
  });

  describe("toDomain", () => {
    it("should map a Mongoose document to a domain entity", () => {
      // Usar Types.ObjectId para tipado estricto con Mongoose
      const mockDoc = {
        _id: new Types.ObjectId(),
        idCard: 12345678,
        fullName: "John Doe",
        priority: "medium",
        status: "waiting",
        office: null,
        timestamp: now,
        completedAt: undefined,
        domainId: "mongo-id-123",
      } as unknown as import("../../../../src/schemas/appointment.schema").AppointmentDocument;

      const entity = AppointmentMapper.toDomain(mockDoc);

      expect(entity).toBeInstanceOf(Appointment);
      expect(entity.id).toBe("mongo-id-123");
      expect(entity.idCard.toValue()).toBe(12345678);
      expect(entity.fullName.toValue()).toBe("John Doe");
      expect(entity.priority.toValue()).toBe("medium");
      expect(entity.status).toBe("waiting");
      expect(entity.office).toBeNull();
    });

    it("should map a called appointment with office", () => {
      const mockDoc = {
        _id: new Types.ObjectId(),
        idCard: 87654321,
        fullName: "Jane Smith",
        priority: "high",
        status: "called",
        office: "5",
        timestamp: now,
        completedAt: now + 15000,
        domainId: "mongo-id-456",
      } as unknown as import("../../../../src/schemas/appointment.schema").AppointmentDocument;

      const entity = AppointmentMapper.toDomain(mockDoc);

      expect(entity.status).toBe("called");
      expect(entity.office).toBe("5");
      expect(entity.completedAt).toBe(now + 15000);
    });
  });

  describe("Roundtrip (toDomain → toPersistence)", () => {
    it("should preserve data through a full roundtrip", () => {
      const originalDoc = {
        _id: new Types.ObjectId(),
        idCard: 55555555,
        fullName: "Roundtrip Test",
        priority: "low",
        status: "completed",
        office: "2",
        timestamp: now,
        completedAt: now + 8000,
        domainId: "roundtrip-id",
      } as unknown as import("../../../../src/schemas/appointment.schema").AppointmentDocument;

      const entity = AppointmentMapper.toDomain(originalDoc);
      const persisted = AppointmentMapper.toPersistence(entity);

      expect(persisted.idCard).toBe(originalDoc.idCard);
      expect(persisted.fullName).toBe(originalDoc.fullName);
      expect(persisted.priority).toBe(originalDoc.priority);
      expect(persisted.status).toBe(originalDoc.status);
      expect(persisted.office).toBe(originalDoc.office);
      expect(persisted.completedAt).toBe(originalDoc.completedAt);
    });
  });
});
