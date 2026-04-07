import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { MetricsController } from "src/metrics/metrics.controller";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { OPERATIONAL_METRICS_PORT } from "src/domain/ports/inbound/operational-metrics.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";

/**
 * SPEC-013: Integration tests for MetricsController.
 * Validates auth, role enforcement, and happy-path response for GET /metrics.
 */
describe("MetricsController (Integration Tests)", () => {
  let app: INestApplication;
  let metricsUseCase: { getMetrics: jest.Mock };
  let firebaseAuth: { verifyIdToken: jest.Mock };
  let profileRepo: { findByUid: jest.Mock };

  const profilesByUid: Record<string, object> = {
    "uid-admin": {
      uid: "uid-admin",
      email: "admin@clinic.example",
      display_name: "Admin",
      role: "admin",
      status: "active",
      doctor_id: null,
    },
    "uid-recep": {
      uid: "uid-recep",
      email: "recep@clinic.example",
      display_name: "Recepcion",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    },
  };

  const mockMetricsPayload = {
    appointments: { waiting: 12, called: 3, completedToday: 45 },
    doctors: { available: 2, busy: 3, offline: 0 },
    performance: {
      avgWaitTimeMinutes: null,
      avgConsultationTimeMinutes: null,
      throughputPerHour: 7.5,
    },
    generatedAt: "2026-04-05T14:30:00.000Z",
  };

  beforeEach(async () => {
    metricsUseCase = { getMetrics: jest.fn() };
    firebaseAuth = { verifyIdToken: jest.fn() };
    profileRepo = { findByUid: jest.fn() };

    firebaseAuth.verifyIdToken.mockImplementation(async (token: string) => {
      if (token === "admin-token") return { uid: "uid-admin" };
      if (token === "recep-token") return { uid: "uid-recep" };
      throw new UnauthorizedException("Token inválido");
    });

    profileRepo.findByUid.mockImplementation(async (uid: string) => {
      return profilesByUid[uid] ?? null;
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: OPERATIONAL_METRICS_PORT,
          useValue: metricsUseCase,
        },
        FirebaseAuthGuard,
        RoleGuard,
        Reflector,
        {
          provide: FIREBASE_AUTH_PORT,
          useValue: firebaseAuth,
        },
        {
          provide: PROFILE_REPOSITORY_TOKEN,
          useValue: profileRepo,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  describe("GET /metrics — happy path (admin)", () => {
    it("should return 200 with operational metrics for admin token", async () => {
      metricsUseCase.getMetrics.mockResolvedValue(mockMetricsPayload);

      const response = await request(app.getHttpServer())
        .get("/metrics")
        .set("Authorization", "Bearer admin-token")
        .expect(200);

      expect(response.body).toEqual(mockMetricsPayload);
      expect(metricsUseCase.getMetrics).toHaveBeenCalledTimes(1);
      expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith("admin-token");
      expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-admin");
    });
  });

  describe("GET /metrics — no token (401)", () => {
    it("should return 401 when Authorization header is missing", async () => {
      await request(app.getHttpServer()).get("/metrics").expect(401);

      expect(metricsUseCase.getMetrics).not.toHaveBeenCalled();
    });
  });

  describe("GET /metrics — invalid token (401)", () => {
    it("should return 401 when Bearer token is invalid", async () => {
      await request(app.getHttpServer())
        .get("/metrics")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);

      expect(metricsUseCase.getMetrics).not.toHaveBeenCalled();
    });
  });

  describe("GET /metrics — non-admin role (403)", () => {
    it("should return 403 when authenticated user is recepcionista", async () => {
      await request(app.getHttpServer())
        .get("/metrics")
        .set("Authorization", "Bearer recep-token")
        .expect(403);

      expect(metricsUseCase.getMetrics).not.toHaveBeenCalled();
    });
  });

  describe("GET /metrics — use case error (500)", () => {
    it("should propagate internal error if use case throws", async () => {
      metricsUseCase.getMetrics.mockRejectedValue(
        new Error("DB connection failed"),
      );

      await request(app.getHttpServer())
        .get("/metrics")
        .set("Authorization", "Bearer admin-token")
        .expect(500);
    });
  });
});
