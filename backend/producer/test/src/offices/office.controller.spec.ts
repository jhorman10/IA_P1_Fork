import {
  ConflictException,
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { AuditInterceptor } from "src/common/interceptors/audit.interceptor";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { OfficeController } from "src/offices/office.controller";
import request from "supertest";

describe("OfficeController (Integration Tests)", () => {
  let app: INestApplication;
  let officeService: {
    getAll: jest.Mock;
    adjustCapacity: jest.Mock;
    updateEnabled: jest.Mock;
  };

  const profilesByUid = {
    "uid-admin": {
      uid: "uid-admin",
      email: "admin@clinic.example",
      display_name: "Admin",
      role: "admin",
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
  };

  beforeEach(async () => {
    const mockOfficeService = {
      getAll: jest.fn(),
      adjustCapacity: jest.fn(),
      updateEnabled: jest.fn(),
    };

    const mockFirebaseAuth = {
      verifyIdToken: jest.fn(),
    };

    const mockProfileRepo = {
      findByUid: jest.fn(),
    };

    mockFirebaseAuth.verifyIdToken.mockImplementation(async (token: string) => {
      if (token === "admin-token") return { uid: "uid-admin" };
      if (token === "doctor-token") return { uid: "uid-doctor" };
      throw new Error("Token invalido");
    });

    mockProfileRepo.findByUid.mockImplementation(async (uid: string) => {
      return profilesByUid[uid as keyof typeof profilesByUid] ?? null;
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OfficeController],
      providers: [
        {
          provide: "OfficeService",
          useValue: mockOfficeService,
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
          useValue: mockFirebaseAuth,
        },
        {
          provide: PROFILE_REPOSITORY_TOKEN,
          useValue: mockProfileRepo,
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

    officeService = module.get("OfficeService");

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it("should list offices for admin", async () => {
    officeService.getAll.mockResolvedValue([
      {
        number: "1",
        enabled: true,
        occupied: false,
        occupiedByDoctorId: null,
        occupiedByDoctorName: null,
        occupiedByStatus: null,
        canDisable: true,
        createdAt: new Date("2026-04-06T10:00:00.000Z"),
        updatedAt: new Date("2026-04-06T10:00:00.000Z"),
      },
    ]);

    const response = await request(app.getHttpServer())
      .get("/offices")
      .set("Authorization", "Bearer admin-token")
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      number: "1",
      enabled: true,
      occupied: false,
      canDisable: true,
    });
    expect(officeService.getAll).toHaveBeenCalledTimes(1);
  });

  it("should return 401 when token is missing", async () => {
    await request(app.getHttpServer()).get("/offices").expect(401);

    expect(officeService.getAll).not.toHaveBeenCalled();
  });

  it("should return 403 when role is not admin", async () => {
    await request(app.getHttpServer())
      .get("/offices")
      .set("Authorization", "Bearer doctor-token")
      .expect(403);

    expect(officeService.getAll).not.toHaveBeenCalled();
  });

  it("should adjust office capacity", async () => {
    officeService.adjustCapacity.mockResolvedValue({
      targetTotal: 8,
      createdOffices: ["6", "7", "8"],
      unchanged: false,
    });

    const response = await request(app.getHttpServer())
      .patch("/offices/capacity")
      .set("Authorization", "Bearer admin-token")
      .send({ target_total: 8 })
      .expect(200);

    expect(response.body).toEqual({
      target_total: 8,
      created_offices: ["6", "7", "8"],
      unchanged: false,
    });
    expect(officeService.adjustCapacity).toHaveBeenCalledWith({
      targetTotal: 8,
    });
  });

  it("should return 400 for invalid target_total", async () => {
    await request(app.getHttpServer())
      .patch("/offices/capacity")
      .set("Authorization", "Bearer admin-token")
      .send({ target_total: 0 })
      .expect(400);

    expect(officeService.adjustCapacity).not.toHaveBeenCalled();
  });

  it("should update enabled flag by office number", async () => {
    officeService.updateEnabled.mockResolvedValue({
      number: "4",
      enabled: false,
      occupied: false,
      occupiedByDoctorId: null,
      occupiedByDoctorName: null,
      occupiedByStatus: null,
      canDisable: false,
      createdAt: new Date("2026-04-06T10:00:00.000Z"),
      updatedAt: new Date("2026-04-06T10:05:00.000Z"),
    });

    const response = await request(app.getHttpServer())
      .patch("/offices/4")
      .set("Authorization", "Bearer admin-token")
      .send({ enabled: false })
      .expect(200);

    expect(response.body).toMatchObject({
      number: "4",
      enabled: false,
      occupied: false,
    });
    expect(officeService.updateEnabled).toHaveBeenCalledWith("4", false);
  });

  it("should return 409 when disabling an occupied office", async () => {
    officeService.updateEnabled.mockRejectedValue(
      new ConflictException(
        "No se puede deshabilitar: el consultorio esta ocupado",
      ),
    );

    await request(app.getHttpServer())
      .patch("/offices/4")
      .set("Authorization", "Bearer admin-token")
      .send({ enabled: false })
      .expect(409);
  });

  it("should return 404 when office does not exist", async () => {
    officeService.updateEnabled.mockRejectedValue(
      new NotFoundException("Consultorio 99 no encontrado"),
    );

    await request(app.getHttpServer())
      .patch("/offices/99")
      .set("Authorization", "Bearer admin-token")
      .send({ enabled: true })
      .expect(404);
  });
});
