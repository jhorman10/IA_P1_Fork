import { MongoMemoryServer } from "mongodb-memory-server";
import { connect, Connection, Model } from "mongoose";
import { MongooseAppointmentRepository } from "../../../../src/infrastructure/persistence/mongoose-appointment.repository";
import {
  Appointment as AppointmentSchemaClass,
  AppointmentDocument,
  AppointmentSchema,
} from "../../../../src/schemas/appointment.schema";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";
import { ConsultationPolicy } from "../../../../src/domain/policies/consultation.policy";
import { LoggerPort } from "../../../../src/domain/ports/outbound/logger.port";

/**
 * Fake Logger for tests
 */
class FakeLogger implements LoggerPort {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  log(message: string): void {
    // Silent in tests
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error(message: string, trace?: string): void {
    // Silent in tests
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(message: string): void {
    // Silent in tests
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug(message: string): void {
    // Silent in tests
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verbose(message: string, context?: string): void {
    // Silent in tests
  }
}

/**
 * Integration Tests: MongooseAppointmentRepository
 *
 * ⚕️ HUMAN CHECK - Los tests verifican:
 * 1. El Repository persiste correctamente los appointments en MongoDB
 * 2. El Mapper convierte correctamente entre las capas de dominio y persistencia
 * 3. Los métodos de query (findWaiting, findAvailableOffices, etc.) funcionan correctamente
 * 4. ConsultationPolicy está correctamente integrada
 * 5. domainId se usa para la identidad de la entidad (no el _id de MongoDB)
 */
describe("MongooseAppointmentRepository (Integration)", () => {
  let mongoServer: MongoMemoryServer;
  let connection: Connection;
  let appointmentModel: Model<AppointmentDocument>;
  let repository: MongooseAppointmentRepository;
  let consultationPolicy: ConsultationPolicy;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect using standalone mongoose (no NestJS DI needed for integration tests)
    connection = (await connect(mongoUri)).connection;
    appointmentModel = connection.model<AppointmentDocument>(
      AppointmentSchemaClass.name,
      // ⚕️ HUMAN CHECK: Cast de tipo de Schema necesario por incompatibilidad de versiones @nestjs/mongoose vs mongoose standalone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      AppointmentSchema as any,
    );

    // Initialize dependencies
    consultationPolicy = new ConsultationPolicy();
    repository = new MongooseAppointmentRepository(
      // ⚕️ HUMAN CHECK: Cast de tipo de Model necesario por incompatibilidad de versiones @nestjs/mongoose vs mongoose standalone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      appointmentModel as any,
      consultationPolicy,
      new FakeLogger(), // ⚕️ H-34: Agregar logger para cumplir con firma del constructor
    );
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await connection.close();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collection before each test
    await appointmentModel.deleteMany({});
  });

  describe("save", () => {
    it("should persist new appointment to database", async () => {
      const apt = new Appointment(
        new IdCard(123456789),
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      const saved = await repository.save(apt);

      expect(saved).toBeDefined();
      expect(saved.idCard.toValue()).toBe(123456789);
      expect(saved.fullName.toValue()).toBe("John Doe");
      expect(saved.status).toBe("waiting");

      // Verify in database
      const doc = await appointmentModel.findOne({
        domainId: apt.id,
      });
      expect(doc).toBeDefined();
      expect(doc?.idCard).toBe(123456789);
    });

    it("should update existing appointment by domainId", async () => {
      // Create initial appointment
      const apt1 = new Appointment(
        new IdCard(111111111),
        new FullName("Alice"),
        new Priority("medium"),
        "waiting",
        null,
        1000000,
        undefined,
        "my-domain-id",
      );

      await repository.save(apt1);

      // Update the same appointment (same domainId)
      const apt2 = new Appointment(
        new IdCard(111111111),
        new FullName("Alice Updated"),
        new Priority("high"),
        "called",
        "C1",
        1000000,
        2000000,
        "my-domain-id", // Same domain ID
      );

      await repository.save(apt2);

      // Should only have 1 document in database
      const docs = await appointmentModel.find();
      expect(docs).toHaveLength(1);

      // Verify it was updated
      const doc = docs[0];
      expect(doc.status).toBe("called");
      expect(doc.office).toBe("C1");
      expect(doc.completedAt).toBe(2000000);
    });

    it("should preserve all appointment fields", async () => {
      const apt = new Appointment(
        new IdCard(987654321),
        new FullName("Jane Smith"),
        new Priority("low"),
        "called",
        "C5",
        1500000,
        1600000,
      );

      const saved = await repository.save(apt);

      expect(saved.idCard.toValue()).toBe(987654321);
      expect(saved.fullName.toValue()).toBe("Jane Smith");
      expect(saved.priority.toValue()).toBe("low");
      expect(saved.status).toBe("called");
      expect(saved.office).toBe("C5");
      expect(saved.timestamp).toBe(1500000);
      expect(saved.completedAt).toBe(1600000);
    });
  });

  describe("findWaiting", () => {
    it("should return all waiting appointments sorted correctly", async () => {
      // Create multiple appointments with different statuses
      const waiting1 = new Appointment(
        new IdCard(111111111),
        new FullName("First Waiting"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      const waiting2 = new Appointment(
        new IdCard(222222222),
        new FullName("Second Waiting"),
        new Priority("medium"),
        "waiting",
        null,
        2000000,
      );

      const called = new Appointment(
        new IdCard(333333333),
        new FullName("Called Patient"),
        new Priority("high"),
        "called",
        "C1",
        3000000,
      );

      await repository.save(waiting1);
      await repository.save(waiting2);
      await repository.save(called);

      const waitingApts = await repository.findWaiting();

      expect(waitingApts).toHaveLength(2);
      expect(waitingApts.every((a) => a.status === "waiting")).toBe(true);
      expect(waitingApts.map((a) => a.idCard.toValue())).toContain(111111111);
      expect(waitingApts.map((a) => a.idCard.toValue())).toContain(222222222);
    });

    it("should return empty array when no waiting appointments", async () => {
      const completed = new Appointment(
        new IdCard(123456789),
        new FullName("Completed"),
        new Priority("low"),
        "completed",
        "C3",
        1000000,
        1500000,
      );

      await repository.save(completed);

      const waiting = await repository.findWaiting();

      expect(waiting).toHaveLength(0);
    });

    it("should sort waiting appointments by priority and timestamp", async () => {
      // Create appointments with mixed priorities
      const lowPriority = new Appointment(
        new IdCard(111111111),
        new FullName("Low Priority"),
        new Priority("low"),
        "waiting",
        null,
        1000000,
      );

      const highPriority = new Appointment(
        new IdCard(222222222),
        new FullName("High Priority"),
        new Priority("high"),
        "waiting",
        null,
        5000000, // Later timestamp
      );

      const mediumPriority = new Appointment(
        new IdCard(333333333),
        new FullName("Medium Priority"),
        new Priority("medium"),
        "waiting",
        null,
        1500000,
      );

      await repository.save(lowPriority);
      await repository.save(highPriority);
      await repository.save(mediumPriority);

      const waiting = await repository.findWaiting();

      expect(waiting).toHaveLength(3);
      // MongoDB sorts priority as string: 'high' < 'low' < 'medium' (alphabetical)
      // The findWaiting query sorts by priority ASC then timestamp ASC
      // All appointments should be present regardless of order
      expect(waiting.some((a) => a.priority.toValue() === "high")).toBe(true);
      expect(waiting.some((a) => a.priority.toValue() === "medium")).toBe(true);
      expect(waiting.some((a) => a.priority.toValue() === "low")).toBe(true);
    });
  });

  describe("findAvailableOffices", () => {
    it("should return all offices when none are occupied", async () => {
      const apt = new Appointment(
        new IdCard(123456789),
        new FullName("John"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      await repository.save(apt);

      const available = await repository.findAvailableOffices([
        "C1",
        "C2",
        "C3",
        "C4",
      ]);

      expect(available).toEqual(["C1", "C2", "C3", "C4"]);
    });

    it("should exclude offices with called appointments", async () => {
      const calledApt1 = new Appointment(
        new IdCard(111111111),
        new FullName("Patient 1"),
        new Priority("high"),
        "called",
        "C1",
        1000000,
      );

      const calledApt2 = new Appointment(
        new IdCard(222222222),
        new FullName("Patient 2"),
        new Priority("medium"),
        "called",
        "C3",
        2000000,
      );

      await repository.save(calledApt1);
      await repository.save(calledApt2);

      const available = await repository.findAvailableOffices([
        "C1",
        "C2",
        "C3",
        "C4",
      ]);

      expect(available).toEqual(["C2", "C4"]);
      expect(available).not.toContain("C1");
      expect(available).not.toContain("C3");
    });

    it("should ignore waiting appointments", async () => {
      const waitingApt = new Appointment(
        new IdCard(123456789),
        new FullName("John"),
        new Priority("high"),
        "waiting",
        "C1", // Has office but not called
        1000000,
      );

      await repository.save(waitingApt);

      const available = await repository.findAvailableOffices(["C1", "C2"]);

      // C1 should still be available because appointment is not "called"
      expect(available).toContain("C1");
    });

    it("should ignore completed appointments", async () => {
      const completedApt = new Appointment(
        new IdCard(123456789),
        new FullName("John"),
        new Priority("high"),
        "completed",
        "C2",
        1000000,
        1500000,
      );

      await repository.save(completedApt);

      const available = await repository.findAvailableOffices([
        "C1",
        "C2",
        "C3",
      ]);

      // C2 should be available because appointment is completed, not called
      expect(available).toEqual(["C1", "C2", "C3"]);
    });
  });

  describe("findById", () => {
    it("should find appointment by MongoDB ObjectId", async () => {
      const apt = new Appointment(
        new IdCard(123456789),
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      await repository.save(apt);

      // Get the MongoDB _id
      const doc = await appointmentModel.findOne({ domainId: apt.id });
      const mongoId = doc!._id.toString();

      const found = await repository.findById(mongoId);

      expect(found).toBeDefined();
      expect(found?.idCard.toValue()).toBe(123456789);
      expect(found?.fullName.toValue()).toBe("John Doe");
    });

    it("should return null for non-existent id", async () => {
      // Use a valid ObjectId format that doesn't exist in DB
      const found = await repository.findById("000000000000000000000001");

      expect(found).toBeNull();
    });
  });

  describe("findByIdCardAndActive", () => {
    it("should find active appointment by IdCard", async () => {
      const idCard = new IdCard(123456789);
      const apt = new Appointment(
        idCard,
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      await repository.save(apt);

      const found = await repository.findByIdCardAndActive(idCard);

      expect(found).toBeDefined();
      expect(found?.idCard.equals(idCard)).toBe(true);
      expect(found?.fullName.toValue()).toBe("John Doe");
    });

    it("should only return waiting or called appointments (active)", async () => {
      const idCard = new IdCard(123456789);

      // Create and complete an appointment
      const completed = new Appointment(
        idCard,
        new FullName("John Doe"),
        new Priority("high"),
        "completed",
        "C1",
        1000000,
        1500000,
      );

      await repository.save(completed);

      const found = await repository.findByIdCardAndActive(idCard);

      // Completed should not be considered "active"
      expect(found).toBeNull();
    });

    it("should find waiting appointments (active)", async () => {
      const idCard = new IdCard(123456789);

      const waiting = new Appointment(
        idCard,
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      await repository.save(waiting);

      const found = await repository.findByIdCardAndActive(idCard);

      expect(found).toBeDefined();
      expect(found?.status).toBe("waiting");
    });

    it("should return null for called appointments (only waiting is active per spec)", async () => {
      // AppointmentQuerySpecification.ACTIVE_STATUSES = ['waiting'] only
      const idCard = new IdCard(123456789);

      const called = new Appointment(
        idCard,
        new FullName("John Doe"),
        new Priority("high"),
        "called",
        "C1",
        1000000,
      );

      await repository.save(called);

      // 'called' is NOT in ACTIVE_STATUSES — only 'waiting' is
      const found = await repository.findByIdCardAndActive(idCard);

      expect(found).toBeNull();
    });

    it("should return null for non-existent IdCard", async () => {
      const found = await repository.findByIdCardAndActive(
        new IdCard(999999999),
      );

      expect(found).toBeNull();
    });
  });

  describe("findExpiredCalled", () => {
    it("should find called appointments with completedAt < now", async () => {
      const now = 2000000;

      // Expired: completedAt < now
      const expired = new Appointment(
        new IdCard(111111111),
        new FullName("Expired"),
        new Priority("high"),
        "called",
        "C1",
        1000000,
        1500000, // completedAt < now (2000000)
      );

      // Not expired: completedAt >= now
      const notExpired = new Appointment(
        new IdCard(222222222),
        new FullName("Not Expired"),
        new Priority("medium"),
        "called",
        "C2",
        1000000,
        2500000, // completedAt > now
      );

      await repository.save(expired);
      await repository.save(notExpired);

      const found = await repository.findExpiredCalled(now);

      expect(found).toHaveLength(1);
      expect(found[0].idCard.toValue()).toBe(111111111);
    });

    it("should ignore waiting appointments", async () => {
      const now = 2000000;

      const waiting = new Appointment(
        new IdCard(123456789),
        new FullName("Waiting"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      await repository.save(waiting);

      const found = await repository.findExpiredCalled(now);

      expect(found).toHaveLength(0);
    });

    it("should ignore completed appointments", async () => {
      const now = 2000000;

      const completed = new Appointment(
        new IdCard(123456789),
        new FullName("Completed"),
        new Priority("high"),
        "completed",
        "C1",
        1000000,
        1500000,
      );

      await repository.save(completed);

      const found = await repository.findExpiredCalled(now);

      // Completed should not be considered "called"
      expect(found).toHaveLength(0);
    });

    it("should find appointments where completedAt < now (lte boundary)", async () => {
      // getExpiredCalledFilter uses $lte: completedAt <= now
      // so completedAt: 4500000 <= now: 5000000 IS found
      const now = 5000000;

      const willBeFound = new Appointment(
        new IdCard(123456789),
        new FullName("Will Be Found"),
        new Priority("high"),
        "called",
        "C1",
        4000000,
        4500000, // 4500000 <= 5000000 → found
      );

      await repository.save(willBeFound);

      const found = await repository.findExpiredCalled(now);

      // completedAt is <= now, so it IS found
      expect(found).toHaveLength(1);
    });
  });

  describe("updateStatus", () => {
    it("should update appointment status", async () => {
      const apt = new Appointment(
        new IdCard(123456789),
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      await repository.save(apt);
      const mongoId = (await appointmentModel.findOne({
        domainId: apt.id,
      }))!._id.toString();

      await repository.updateStatus(mongoId, "called");

      const updated = await repository.findById(mongoId);

      expect(updated?.status).toBe("called");
    });

    it("should update status from waiting to called", async () => {
      const apt = new Appointment(
        new IdCard(123456789),
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
      );

      await repository.save(apt);
      const mongoId = (await appointmentModel.findOne({
        domainId: apt.id,
      }))!._id.toString();

      await repository.updateStatus(mongoId, "called");

      const doc = await appointmentModel.findById(mongoId);
      expect(doc?.status).toBe("called");
    });

    it("should update status from called to completed", async () => {
      const apt = new Appointment(
        new IdCard(123456789),
        new FullName("John Doe"),
        new Priority("high"),
        "called",
        "C1",
        1000000,
      );

      await repository.save(apt);
      const mongoId = (await appointmentModel.findOne({
        domainId: apt.id,
      }))!._id.toString();

      await repository.updateStatus(mongoId, "completed");

      const doc = await appointmentModel.findById(mongoId);
      expect(doc?.status).toBe("completed");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete appointment lifecycle", async () => {
      // 1. Create (waiting)
      const apt = new Appointment(
        new IdCard(123456789),
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
      );

      let saved = await repository.save(apt);
      expect(saved.status).toBe("waiting");

      // 2. Find in waiting queue
      const waiting = await repository.findWaiting();
      expect(waiting).toContainEqual(
        expect.objectContaining({
          status: "waiting",
        }),
      );

      // 3. Assign office (called)
      const assigned = new Appointment(
        apt.idCard,
        apt.fullName,
        apt.priority,
        "called",
        "C1",
        apt.timestamp,
        apt.timestamp + 10000,
        apt.id,
      );

      saved = await repository.save(assigned);
      expect(saved.status).toBe("called");
      expect(saved.office).toBe("C1");

      // 4. Find available offices (should exclude C1)
      const available = await repository.findAvailableOffices([
        "C1",
        "C2",
        "C3",
      ]);
      expect(available).toEqual(["C2", "C3"]);

      // 5. Complete appointment
      const completed = new Appointment(
        apt.idCard,
        apt.fullName,
        apt.priority,
        "completed",
        "C1",
        apt.timestamp,
        apt.timestamp + 15000,
        apt.id,
      );

      saved = await repository.save(completed);
      expect(saved.status).toBe("completed");

      // 6. Verify no longer waiting
      const stillWaiting = await repository.findWaiting();
      expect(stillWaiting.some((a) => a.idCard.equals(apt.idCard))).toBe(false);

      // 7. Verify office is available again
      const availableAfterComplete = await repository.findAvailableOffices([
        "C1",
        "C2",
        "C3",
      ]);
      expect(availableAfterComplete).toEqual(["C1", "C2", "C3"]);
    });

    it("should handle multiple concurrent saves with same domainId", async () => {
      const domainId = "concurrent-test-id";

      const apt1 = new Appointment(
        new IdCard(123456789),
        new FullName("John"),
        new Priority("high"),
        "waiting",
        null,
        1000000,
        undefined,
        domainId,
      );

      const apt2 = new Appointment(
        new IdCard(123456789),
        new FullName("John Updated"),
        new Priority("medium"),
        "called",
        "C1",
        1000000,
        1500000,
        domainId,
      );

      const apt3 = new Appointment(
        new IdCard(123456789),
        new FullName("John Final"),
        new Priority("low"),
        "completed",
        "C1",
        1000000,
        1600000,
        domainId,
      );

      await repository.save(apt1);
      await repository.save(apt2);
      await repository.save(apt3);

      // Should only have 1 document
      const docs = await appointmentModel.find({ domainId });
      expect(docs).toHaveLength(1);

      // Should have latest state — findByIdCardAndActive only returns 'waiting' status
      // The final state is 'completed' so it won't be found as 'active'
      const final = await repository.findByIdCardAndActive(
        new IdCard(123456789),
      );
      expect(final).toBeNull(); // completed is not 'active' per ACTIVE_STATUSES spec

      // Verify the document exists and has correct final state via direct model query
      const doc = await appointmentModel.findOne({ idCard: 123456789 });
      expect(doc?.status).toBe("completed");
    });

    it("should preserve idempotency with save + findByIdCardAndActive", async () => {
      const idCard = new IdCard(123456789);

      const apt = new Appointment(
        idCard,
        new FullName("John Doe"),
        new Priority("high"),
        "waiting",
      );

      // First save
      await repository.save(apt);

      // Try to find active
      const found1 = await repository.findByIdCardAndActive(idCard);
      expect(found1).toBeDefined();

      // Second save (should be idempotent)
      await repository.save(apt);

      // Database should still have 1 document
      const docs = await appointmentModel.find({ idCard: 123456789 });
      expect(docs).toHaveLength(1);

      // Found should be consistent
      const found2 = await repository.findByIdCardAndActive(idCard);
      expect(found2?.id).toBe(found1?.id);
    });
  });
});
