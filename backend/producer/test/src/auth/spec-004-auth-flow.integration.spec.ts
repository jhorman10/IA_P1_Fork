import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "src/auth/auth.controller";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { ProfileView } from "src/domain/models/profile-view";
import { PROFILE_SERVICE_TOKEN } from "src/domain/ports/inbound/profile-service.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { ProducerController } from "src/producer.controller";
import * as request from "supertest";

describe("SPEC-004 Auth Flow (Integration)", () => {
  let app: INestApplication;

  let profileService: {
    resolveSession: jest.Mock;
  };

  let createAppointmentUseCase: {
    execute: jest.Mock;
  };

  const profilesByUid: Record<string, ProfileView> = {
    "uid-recep": {
      uid: "uid-recep",
      email: "recep@clinic.example",
      display_name: "Recepción",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    },
    "uid-doctor": {
      uid: "uid-doctor",
      email: "doctor@clinic.example",
      display_name: "Doctor",
      role: "doctor",
      status: "active",
      doctor_id: "doc-001",
    },
    "uid-inactive": {
      uid: "uid-inactive",
      email: "inactive@clinic.example",
      display_name: "Inactive",
      role: "doctor",
      status: "inactive",
      doctor_id: "doc-001",
    },
  };

  beforeEach(async () => {
    const mockProfileService = {
      resolveSession: jest.fn(),
    };

    const mockCreateAppointmentUseCase = {
      execute: jest.fn(),
    };

    const mockQueryAppointmentsUseCase = {
      findAll: jest.fn(),
      findByIdCard: jest.fn(),
    };

    const mockFirebaseAuth = {
      verifyIdToken: jest.fn(),
    };

    const mockProfileRepo = {
      findByUid: jest.fn(),
    };

    mockFirebaseAuth.verifyIdToken.mockImplementation(async (token: string) => {
      if (token === "recep-token") return { uid: "uid-recep" };
      if (token === "doctor-token") return { uid: "uid-doctor" };
      if (token === "inactive-token") return { uid: "uid-inactive" };
      throw new UnauthorizedException("Token inválido");
    });

    mockProfileRepo.findByUid.mockImplementation(async (uid: string) => {
      return profilesByUid[uid] ?? null;
    });

    mockProfileService.resolveSession.mockImplementation(
      async (uid: string) => {
        const profile = profilesByUid[uid];
        if (!profile)
          throw new ForbiddenException("Perfil operativo no configurado");
        if (profile.status !== "active") {
          throw new ForbiddenException("Perfil inactivo");
        }
        return profile;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController, ProducerController],
      providers: [
        {
          provide: PROFILE_SERVICE_TOKEN,
          useValue: mockProfileService,
        },
        {
          provide: "CreateAppointmentUseCase",
          useValue: mockCreateAppointmentUseCase,
        },
        {
          provide: "QueryAppointmentsUseCase",
          useValue: mockQueryAppointmentsUseCase,
        },
        FirebaseAuthGuard,
        RoleGuard,
        Reflector,
        {
          provide: FIREBASE_AUTH_PORT,
          useValue: mockFirebaseAuth,
        },
        {
          provide: PROFILE_REPOSITORY_TOKEN,
          useValue: mockProfileRepo,
        },
        {
          provide: OPERATIONAL_AUDIT_PORT,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
            hasRecentEntry: jest.fn().mockResolvedValue(false),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    profileService = module.get(PROFILE_SERVICE_TOKEN);
    createAppointmentUseCase = module.get("CreateAppointmentUseCase");

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it("should resolve session and allow recepcionista to create appointment", async () => {
    // GIVEN
    profileService.resolveSession.mockResolvedValue(profilesByUid["uid-recep"]);
    createAppointmentUseCase.execute.mockResolvedValue(undefined);

    // WHEN
    const sessionResponse = await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer recep-token")
      .send({})
      .expect(200);

    const appointmentResponse = await request(app.getHttpServer())
      .post("/appointments")
      .set("Authorization", "Bearer recep-token")
      .send({
        idCard: 123456789,
        fullName: "Paciente Recepción",
        priority: "high",
      })
      .expect(202);

    // THEN
    expect(sessionResponse.body).toMatchObject({
      uid: "uid-recep",
      role: "recepcionista",
      status: "active",
      allowed_modules: ["dashboard", "registration"],
    });
    expect(appointmentResponse.body).toEqual({
      status: "accepted",
      message: "Asignación de turno en progreso",
    });
    expect(createAppointmentUseCase.execute).toHaveBeenCalledWith({
      idCard: 123456789,
      fullName: "Paciente Recepción",
      priority: "high",
    });
  });

  it("should resolve doctor session but block doctor on POST /appointments", async () => {
    // GIVEN
    profileService.resolveSession.mockResolvedValue(
      profilesByUid["uid-doctor"],
    );

    // WHEN
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer doctor-token")
      .send({})
      .expect(200);

    await request(app.getHttpServer())
      .post("/appointments")
      .set("Authorization", "Bearer doctor-token")
      .send({
        idCard: 123456789,
        fullName: "Paciente Doctor",
        priority: "medium",
      })
      .expect(403);

    // THEN
    expect(createAppointmentUseCase.execute).not.toHaveBeenCalled();
  });

  it("should return 403 for inactive profile in auth session", async () => {
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer inactive-token")
      .send({})
      .expect(403);

    expect(profileService.resolveSession).not.toHaveBeenCalled();
  });
});
