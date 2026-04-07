import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AppointmentLifecycleController } from "src/appointments/appointment-lifecycle.controller";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { AuditInterceptor } from "src/common/interceptors/audit.interceptor";
import { AppointmentView } from "src/domain/models/appointment-view";
import {
  AppointmentLifecyclePublisherPort,
  LIFECYCLE_PUBLISHER_TOKEN,
} from "src/domain/ports/outbound/appointment-lifecycle-publisher.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import * as request from "supertest";

describe("AppointmentLifecycleController (Integration Tests)", () => {
  let app: INestApplication;
  let appointmentReadRepository: { findById: jest.Mock };
  let lifecyclePublisher: jest.Mocked<AppointmentLifecyclePublisherPort>;
  let firebaseAuth: { verifyIdToken: jest.Mock };
  let profileRepo: { findByUid: jest.Mock };

  const profilesByUid: Record<string, any> = {
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
    "uid-doc-a": {
      uid: "uid-doc-a",
      email: "doca@clinic.example",
      display_name: "Doctor A",
      role: "doctor",
      status: "active",
      doctor_id: "doc-a",
    },
    "uid-doc-b": {
      uid: "uid-doc-b",
      email: "docb@clinic.example",
      display_name: "Doctor B",
      role: "doctor",
      status: "active",
      doctor_id: "doc-b",
    },
  };

  const makeAppointment = (
    overrides: Partial<AppointmentView> = {},
  ): AppointmentView => ({
    id: "apt-1",
    fullName: "Paciente Demo",
    idCard: 123456,
    office: "3",
    status: "called",
    priority: "medium",
    timestamp: 1760000000,
    doctorId: "doc-a",
    ...overrides,
  });

  beforeEach(async () => {
    appointmentReadRepository = {
      findById: jest.fn(),
    };

    lifecyclePublisher = {
      publishCompleteAppointment: jest.fn(),
      publishCancelAppointment: jest.fn(),
    } as unknown as jest.Mocked<AppointmentLifecyclePublisherPort>;

    firebaseAuth = {
      verifyIdToken: jest.fn(async (token: string) => {
        if (token === "admin-token") return { uid: "uid-admin" };
        if (token === "recep-token") return { uid: "uid-recep" };
        if (token === "doctor-a-token") return { uid: "uid-doc-a" };
        if (token === "doctor-b-token") return { uid: "uid-doc-b" };
        throw new Error("Token inválido");
      }),
    };

    profileRepo = {
      findByUid: jest.fn(async (uid: string) => profilesByUid[uid] ?? null),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentLifecycleController],
      providers: [
        {
          provide: "AppointmentReadRepository",
          useValue: appointmentReadRepository,
        },
        {
          provide: LIFECYCLE_PUBLISHER_TOKEN,
          useValue: lifecyclePublisher,
        },
        FirebaseAuthGuard,
        RoleGuard,
        Reflector,
        AuditInterceptor,
        {
          provide: OPERATIONAL_AUDIT_PORT,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
            hasRecentEntry: jest.fn().mockResolvedValue(false),
          },
        },
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
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  describe("PATCH /appointments/:id/complete", () => {
    it("should return 200 and publish event for admin", async () => {
      appointmentReadRepository.findById.mockResolvedValue(
        makeAppointment({ id: "apt-200", status: "called", doctorId: "doc-a" }),
      );
      lifecyclePublisher.publishCompleteAppointment.mockResolvedValue(
        undefined,
      );

      const response = await request(app.getHttpServer())
        .patch("/appointments/apt-200/complete")
        .set("Authorization", "Bearer admin-token")
        .expect(200);

      expect(response.body).toEqual({
        status: "accepted",
        message: "Turno marcado como completado",
      });
      expect(
        lifecyclePublisher.publishCompleteAppointment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: "apt-200",
          actorUid: "uid-admin",
        }),
      );
    });

    it("should return 200 and publish event when doctor completes own appointment", async () => {
      appointmentReadRepository.findById.mockResolvedValue(
        makeAppointment({ id: "apt-own", status: "called", doctorId: "doc-a" }),
      );
      lifecyclePublisher.publishCompleteAppointment.mockResolvedValue(
        undefined,
      );

      await request(app.getHttpServer())
        .patch("/appointments/apt-own/complete")
        .set("Authorization", "Bearer doctor-a-token")
        .expect(200);

      expect(
        lifecyclePublisher.publishCompleteAppointment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: "apt-own",
          actorUid: "uid-doc-a",
        }),
      );
    });

    it("should return 401 when token is missing", async () => {
      await request(app.getHttpServer())
        .patch("/appointments/apt-no-token/complete")
        .expect(401);

      expect(
        lifecyclePublisher.publishCompleteAppointment,
      ).not.toHaveBeenCalled();
    });

    it("should return 404 when appointment does not exist", async () => {
      appointmentReadRepository.findById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch("/appointments/not-found/complete")
        .set("Authorization", "Bearer admin-token")
        .expect(404);

      expect(response.body.message).toBe("Turno no encontrado");
      expect(
        lifecyclePublisher.publishCompleteAppointment,
      ).not.toHaveBeenCalled();
    });

    it("should return 409 when appointment is not called", async () => {
      appointmentReadRepository.findById.mockResolvedValue(
        makeAppointment({ id: "apt-waiting", status: "waiting" }),
      );

      const response = await request(app.getHttpServer())
        .patch("/appointments/apt-waiting/complete")
        .set("Authorization", "Bearer admin-token")
        .expect(409);

      expect(response.body.message).toBe(
        "Solo turnos en atención (called) pueden completarse",
      );
      expect(
        lifecyclePublisher.publishCompleteAppointment,
      ).not.toHaveBeenCalled();
    });

    it("should return 403 when doctor tries to complete appointment of another doctor", async () => {
      appointmentReadRepository.findById.mockResolvedValue(
        makeAppointment({
          id: "apt-other",
          status: "called",
          doctorId: "doc-b",
        }),
      );

      const response = await request(app.getHttpServer())
        .patch("/appointments/apt-other/complete")
        .set("Authorization", "Bearer doctor-a-token")
        .expect(403);

      expect(response.body.message).toBe(
        "No autorizado para completar turno de otro médico",
      );
      expect(
        lifecyclePublisher.publishCompleteAppointment,
      ).not.toHaveBeenCalled();
    });
  });

  describe("PATCH /appointments/:id/cancel", () => {
    it("should return 200 and publish event for recepcionista", async () => {
      appointmentReadRepository.findById.mockResolvedValue(
        makeAppointment({
          id: "apt-cancel",
          status: "waiting",
          doctorId: null,
        }),
      );
      lifecyclePublisher.publishCancelAppointment.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .patch("/appointments/apt-cancel/cancel")
        .set("Authorization", "Bearer recep-token")
        .expect(200);

      expect(response.body).toEqual({
        status: "accepted",
        message: "Turno cancelado",
      });
      expect(lifecyclePublisher.publishCancelAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: "apt-cancel",
          actorUid: "uid-recep",
        }),
      );
    });

    it("should return 404 when appointment does not exist", async () => {
      appointmentReadRepository.findById.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .patch("/appointments/not-found/cancel")
        .set("Authorization", "Bearer recep-token")
        .expect(404);

      expect(response.body.message).toBe("Turno no encontrado");
      expect(
        lifecyclePublisher.publishCancelAppointment,
      ).not.toHaveBeenCalled();
    });

    it("should return 409 when appointment status is not waiting", async () => {
      appointmentReadRepository.findById.mockResolvedValue(
        makeAppointment({ id: "apt-called", status: "called" }),
      );

      const response = await request(app.getHttpServer())
        .patch("/appointments/apt-called/cancel")
        .set("Authorization", "Bearer admin-token")
        .expect(409);

      expect(response.body.message).toBe(
        "Solo turnos en espera (waiting) pueden cancelarse",
      );
      expect(
        lifecyclePublisher.publishCancelAppointment,
      ).not.toHaveBeenCalled();
    });

    it("should return 403 when role is doctor", async () => {
      appointmentReadRepository.findById.mockResolvedValue(
        makeAppointment({ id: "apt-role", status: "waiting", doctorId: null }),
      );

      await request(app.getHttpServer())
        .patch("/appointments/apt-role/cancel")
        .set("Authorization", "Bearer doctor-a-token")
        .expect(403);

      expect(
        lifecyclePublisher.publishCancelAppointment,
      ).not.toHaveBeenCalled();
    });
  });
});
