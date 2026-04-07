import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AppointmentQueryController } from "src/appointments/appointment-query.controller";
import { AuthController } from "src/auth/auth.controller";
import { DoctorContextGuard } from "src/auth/guards/doctor-context.guard";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { AuditInterceptor } from "src/common/interceptors/audit.interceptor";
import { DoctorController } from "src/doctors/doctor.controller";
import { ProfileView } from "src/domain/models/profile-view";
import { PROFILE_SERVICE_TOKEN } from "src/domain/ports/inbound/profile-service.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { ProducerController } from "src/producer.controller";
import { AppointmentEventPayload } from "src/types/appointment-event";
import * as request from "supertest";

describe("SPEC-005 Auth-aware Journey (Integration)", () => {
  let app: INestApplication;

  let profileService: {
    resolveSession: jest.Mock;
  };

  let createAppointmentUseCase: {
    execute: jest.Mock;
  };

  let queryAppointmentsUseCase: {
    findAll: jest.Mock;
    findByIdCard: jest.Mock;
  };

  let doctorService: {
    createDoctor: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    checkIn: jest.Mock;
    checkOut: jest.Mock;
  };

  const profilesByUid: Record<string, ProfileView> = {
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

  const publicQueueSnapshot: AppointmentEventPayload[] = [
    {
      id: "appt-001",
      fullName: "Paciente Público",
      idCard: 987654321,
      office: null,
      status: "waiting",
      priority: "medium",
      timestamp: 1712251200000,
    },
  ];

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

    const mockGetQueuePositionUseCase = {
      execute: jest.fn(),
    };

    const mockDoctorService = {
      createDoctor: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      checkIn: jest.fn(),
      checkOut: jest.fn(),
    };

    const mockFirebaseAuth = {
      verifyIdToken: jest.fn(),
    };

    const mockProfileRepo = {
      findByUid: jest.fn(),
    };

    mockFirebaseAuth.verifyIdToken.mockImplementation(async (token: string) => {
      if (token === "admin-token") return { uid: "uid-admin" };
      if (token === "recep-token") return { uid: "uid-recep" };
      if (token === "doctor-token") return { uid: "uid-doctor" };
      if (token === "inactive-token") return { uid: "uid-inactive" };
      if (token === "missing-profile-token") return { uid: "uid-missing" };
      throw new UnauthorizedException("Token inválido");
    });

    mockProfileRepo.findByUid.mockImplementation(async (uid: string) => {
      return profilesByUid[uid] ?? null;
    });

    mockProfileService.resolveSession.mockImplementation(
      async (uid: string) => {
        const profile = profilesByUid[uid];
        if (!profile) {
          throw new ForbiddenException("Perfil operativo no configurado");
        }
        if (profile.status !== "active") {
          throw new ForbiddenException("Perfil inactivo");
        }
        return profile;
      },
    );

    mockCreateAppointmentUseCase.execute.mockResolvedValue(undefined);
    mockQueryAppointmentsUseCase.findAll.mockResolvedValue(publicQueueSnapshot);

    mockDoctorService.checkIn.mockImplementation(async (id: string) => {
      return {
        id,
        name: "Dr. Ana Pérez",
        specialty: "Medicina General",
        office: "3",
        status: "available",
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        ProducerController,
        DoctorController,
        AppointmentQueryController,
      ],
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
        {
          provide: "GetQueuePositionUseCase",
          useValue: mockGetQueuePositionUseCase,
        },
        {
          provide: "DoctorService",
          useValue: mockDoctorService,
        },
        FirebaseAuthGuard,
        RoleGuard,
        DoctorContextGuard,
        Reflector,
        {
          provide: FIREBASE_AUTH_PORT,
          useValue: mockFirebaseAuth,
        },
        {
          provide: PROFILE_REPOSITORY_TOKEN,
          useValue: mockProfileRepo,
        },
        AuditInterceptor,
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
    queryAppointmentsUseCase = module.get("QueryAppointmentsUseCase");
    doctorService = module.get("DoctorService");

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it("should resolve admin session with expected modules", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(200);

    expect(response.body).toMatchObject({
      uid: "uid-admin",
      role: "admin",
      status: "active",
      allowed_modules: ["dashboard", "registration", "doctors", "profiles"],
    });
    expect(profileService.resolveSession).toHaveBeenCalledWith("uid-admin");
  });

  it("should resolve recepcionista session with expected modules", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer recep-token")
      .send({})
      .expect(200);

    expect(response.body).toMatchObject({
      uid: "uid-recep",
      role: "recepcionista",
      status: "active",
      allowed_modules: ["dashboard", "registration"],
    });
  });

  it("should resolve doctor session with check-in context modules", async () => {
    const response = await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer doctor-token")
      .send({})
      .expect(200);

    expect(response.body).toMatchObject({
      uid: "uid-doctor",
      role: "doctor",
      status: "active",
      doctor_id: "doc-001",
      allowed_modules: ["dashboard", "check-in"],
    });
  });

  it("should return 403 when session is requested with valid token but missing profile", async () => {
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer missing-profile-token")
      .send({})
      .expect(403);

    expect(profileService.resolveSession).not.toHaveBeenCalled();
  });

  it("should return 403 when session is requested by inactive profile", async () => {
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer inactive-token")
      .send({})
      .expect(403);

    expect(profileService.resolveSession).not.toHaveBeenCalled();
  });

  it("should allow recepcionista journey: session then protected appointment registration", async () => {
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer recep-token")
      .send({})
      .expect(200);

    const response = await request(app.getHttpServer())
      .post("/appointments")
      .set("Authorization", "Bearer recep-token")
      .send({
        idCard: 100200300,
        fullName: "Paciente Recepción",
        priority: "high",
      })
      .expect(202);

    expect(response.body).toEqual({
      status: "accepted",
      message: "Asignación de turno en progreso",
    });
    expect(createAppointmentUseCase.execute).toHaveBeenCalledWith({
      idCard: 100200300,
      fullName: "Paciente Recepción",
      priority: "high",
    });
  });

  it("should allow doctor journey: session then check-in in own context", async () => {
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer doctor-token")
      .send({})
      .expect(200);

    const response = await request(app.getHttpServer())
      .patch("/doctors/doc-001/check-in")
      .set("Authorization", "Bearer doctor-token")
      .expect(200);

    expect(response.body).toMatchObject({
      id: "doc-001",
      status: "available",
      message: "Médico registrado como disponible",
    });
    expect(doctorService.checkIn).toHaveBeenCalledWith("doc-001");
  });

  it("should return 403 when doctor tries to check in another doctor context", async () => {
    await request(app.getHttpServer())
      .patch("/doctors/doc-999/check-in")
      .set("Authorization", "Bearer doctor-token")
      .expect(403);

    expect(doctorService.checkIn).not.toHaveBeenCalled();
  });

  it("should keep public queue flow available without authentication", async () => {
    const response = await request(app.getHttpServer())
      .get("/appointments")
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: "appt-001",
      idCard: 987654321,
      status: "waiting",
      priority: "medium",
    });
    expect(queryAppointmentsUseCase.findAll).toHaveBeenCalledTimes(1);
  });
});
