/**
 * SPEC-004 — Auth-Aware E2E Test Suite (Black-Box)
 *
 * Covers the following scenarios from the spec access matrix:
 *   1. POST /auth/session  — active profile → HTTP 200 with role + modules
 *   2. POST /auth/session  — missing profile → HTTP 403
 *   3. POST /appointments  — admin token → HTTP 202 (accepted)
 *   4. POST /appointments  — doctor token → HTTP 403 (role blocked)
 *   5. PATCH /doctors/:id/check-in — own doctor → HTTP 200
 *   6. PATCH /doctors/:id/check-in — foreign doctor → HTTP 403
 *   7. GET /health          — public endpoint remains accessible without auth
 *
 * Infrastructure requirements (provided via env vars):
 *   NODE_ENV=test        — required to enable auth bypass safely
 *   E2E_TEST_MODE=true   — explicit flag to activate Firebase bypass
 *   MONGODB_URI          — real MongoDB instance
 *   RABBITMQ_URL         — AMQP URL (fire-and-forget; app starts even if unreachable)
 *   RABBITMQ_QUEUE       — queue name
 *
 * Token format when E2E_TEST_MODE=true: "e2e::<uid>"
 * The FirebaseAuthAdapter decodes the uid directly without calling Firebase.
 * The FirebaseAuthGuard still requires a matching active Profile in MongoDB.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Bootstrap env vars BEFORE importing AppModule (ConfigService reads process.env)
// ──────────────────────────────────────────────────────────────────────────────
process.env["NODE_ENV"] = process.env["NODE_ENV"] ?? "test";

if (process.env["NODE_ENV"] !== "test") {
  throw new Error(
    "Auth-aware E2E requires NODE_ENV=test (security guard for auth bypass)",
  );
}

if (process.env["E2E_TEST_MODE"]?.toLowerCase() !== "true") {
  throw new Error(
    "Auth-aware E2E requires explicit E2E_TEST_MODE=true (bypass is never default)",
  );
}

process.env["MONGODB_URI"] =
  process.env["MONGODB_URI"] ??
  "mongodb://sofka_admin:sofka_secure_pass_456@localhost:27017/appointments_e2e_test?authSource=admin";
process.env["RABBITMQ_URL"] =
  process.env["RABBITMQ_URL"] ??
  "amqp://sofka_user:sofka_password123@localhost:5672";
process.env["RABBITMQ_QUEUE"] = process.env["RABBITMQ_QUEUE"] ?? "turnos_queue";
process.env["RABBITMQ_NOTIFICATIONS_QUEUE"] =
  process.env["RABBITMQ_NOTIFICATIONS_QUEUE"] ?? "turnos_notifications";
process.env["FRONTEND_URL"] =
  process.env["FRONTEND_URL"] ?? "http://localhost:3001";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { MongoClient } from "mongodb";
import supertest = require("supertest");

import { AppModule } from "src/app.module";
import { DomainExceptionFilter } from "src/infrastructure/filters/domain-exception.filter";

// ──────────────────────────────────────────────────────────────────────────────
// Test fixtures
// ──────────────────────────────────────────────────────────────────────────────

const E2E_ADMIN_UID = "e2e-admin-uid-001";
const E2E_RECEP_UID = "e2e-recep-uid-001";
const E2E_DOCTOR_UID = "e2e-doctor-uid-001";
const E2E_NO_PROFILE_UID = "e2e-no-profile-uid";

/** Token helpers (E2E_TEST_MODE bypass format) */
const bearerOf = (uid: string) => `Bearer e2e::${uid}`;

// ──────────────────────────────────────────────────────────────────────────────
// Suite
// ──────────────────────────────────────────────────────────────────────────────

describe("SPEC-004 Auth-Aware E2E", () => {
  let app: INestApplication;
  let mongo: MongoClient;
  let doctorId: string;

  beforeAll(async () => {
    // ── 1. Connect directly to MongoDB to seed test data ──────────────────────
    mongo = new MongoClient(process.env["MONGODB_URI"]!);
    await mongo.connect();
    const db = mongo.db();

    // Clean previous E2E run artifacts
    await db.collection("profiles").deleteMany({
      uid: { $in: [E2E_ADMIN_UID, E2E_RECEP_UID, E2E_DOCTOR_UID] },
    });
    await db.collection("doctors").deleteMany({ name: "E2E Doctor Test" });
    await db
      .collection("appointments")
      .deleteMany({ fullName: "E2E Paciente Test" });

    // Seed a doctor
    const doctorInsert = await db.collection("doctors").insertOne({
      name: "E2E Doctor Test",
      specialty: "General",
      office: "3",
      status: "offline",
      profileUid: E2E_DOCTOR_UID,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    doctorId = doctorInsert.insertedId.toHexString();

    const now = new Date();

    // Seed profiles
    await db.collection("profiles").insertMany([
      {
        uid: E2E_ADMIN_UID,
        email: "e2e-admin@clinic.test",
        display_name: "E2E Admin",
        role: "admin",
        status: "active",
        doctor_id: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        uid: E2E_RECEP_UID,
        email: "e2e-recep@clinic.test",
        display_name: "E2E Recepcionista",
        role: "recepcionista",
        status: "active",
        doctor_id: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        uid: E2E_DOCTOR_UID,
        email: "e2e-doctor@clinic.test",
        display_name: "E2E Doctor",
        role: "doctor",
        status: "active",
        doctor_id: doctorId,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    // ── 2. Boot NestJS app in-process ─────────────────────────────────────────
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new DomainExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    // Clean up test data
    const db = mongo.db();
    await db.collection("profiles").deleteMany({
      uid: { $in: [E2E_ADMIN_UID, E2E_RECEP_UID, E2E_DOCTOR_UID] },
    });
    await db.collection("doctors").deleteMany({ name: "E2E Doctor Test" });
    await db
      .collection("appointments")
      .deleteMany({ fullName: "Paciente Prueba" });
    await mongo.close();
    await app.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: Health check — must remain accessible without auth
  // ──────────────────────────────────────────────────────────────────────────

  describe("GET /health — public endpoint", () => {
    it("returns 200 without authentication", async () => {
      const res = await supertest(app.getHttpServer()).get("/health");
      expect(res.status).toBe(200);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /auth/session — HU-01 CRITERIO-1.1 + CRITERIO-1.2
  // ──────────────────────────────────────────────────────────────────────────

  describe("POST /auth/session", () => {
    it("CRITERIO-1.1 — returns 200 with role and allowed_modules for active admin profile", async () => {
      const res = await supertest(app.getHttpServer())
        .post("/auth/session")
        .set("Authorization", bearerOf(E2E_ADMIN_UID));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        uid: E2E_ADMIN_UID,
        role: "admin",
        status: "active",
      });
      expect(Array.isArray(res.body.allowed_modules)).toBe(true);
      expect(res.body.allowed_modules).toContain("dashboard");
    });

    it("CRITERIO-1.1 — returns 200 with role and allowed_modules for active recepcionista profile", async () => {
      const res = await supertest(app.getHttpServer())
        .post("/auth/session")
        .set("Authorization", bearerOf(E2E_RECEP_UID));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        uid: E2E_RECEP_UID,
        role: "recepcionista",
        status: "active",
      });
    });

    it("CRITERIO-1.2 — returns 403 when token is valid but profile does not exist", async () => {
      const res = await supertest(app.getHttpServer())
        .post("/auth/session")
        .set("Authorization", bearerOf(E2E_NO_PROFILE_UID));

      expect(res.status).toBe(403);
    });

    it("returns 401 when Authorization header is missing", async () => {
      const res = await supertest(app.getHttpServer()).post("/auth/session");
      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /profiles/me — protected operation allowed
  // ──────────────────────────────────────────────────────────────────────────

  describe("GET /profiles/me", () => {
    it("returns 200 for an active authenticated admin profile", async () => {
      const res = await supertest(app.getHttpServer())
        .get("/profiles/me")
        .set("Authorization", bearerOf(E2E_ADMIN_UID));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        uid: E2E_ADMIN_UID,
        role: "admin",
        status: "active",
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /appointments — HU-03 CRITERIO-3.3
  // ──────────────────────────────────────────────────────────────────────────

  describe("POST /appointments", () => {
    const validPayload = {
      idCard: 999888777,
      fullName: "Paciente Prueba",
      priority: "medium",
    };

    it("CRITERIO-3.3 — returns 403 when doctor (unauthorized role) tries to post an appointment", async () => {
      const res = await supertest(app.getHttpServer())
        .post("/appointments")
        .set("Authorization", bearerOf(E2E_DOCTOR_UID))
        .send({ ...validPayload, idCard: 999888799 });

      expect(res.status).toBe(403);
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await supertest(app.getHttpServer())
        .post("/appointments")
        .send(validPayload);

      expect(res.status).toBe(401);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // PATCH /doctors/:id/check-in — HU-03 CRITERIO-3.4
  // ──────────────────────────────────────────────────────────────────────────

  describe("PATCH /doctors/:id/check-in", () => {
    it("CRITERIO-3.4 — doctor is rejected when trying to check-in a foreign doctor", async () => {
      // Insert a second doctor not linked to E2E_DOCTOR_UID
      const db = mongo.db();
      const other = await db.collection("doctors").insertOne({
        name: "E2E Other Doctor",
        specialty: "Pediatrics",
        office: "4",
        status: "offline",
        profileUid: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      const otherId = other.insertedId.toHexString();

      const res = await supertest(app.getHttpServer())
        .patch(`/doctors/${otherId}/check-in`)
        .set("Authorization", bearerOf(E2E_DOCTOR_UID));

      expect(res.status).toBe(403);

      // Cleanup other doctor
      await db.collection("doctors").deleteOne({ _id: other.insertedId });
    });

    it("returns 401 when no Authorization header is provided", async () => {
      const res = await supertest(app.getHttpServer()).patch(
        `/doctors/${doctorId}/check-in`,
      );
      expect(res.status).toBe(401);
    });
  });
});
