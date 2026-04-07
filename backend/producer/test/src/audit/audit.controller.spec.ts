import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";

import { AuditController } from "src/audit/audit.controller";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { OPERATIONAL_AUDIT_QUERY_PORT } from "src/domain/ports/outbound/operational-audit-query.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import request from "supertest";

describe("AuditController (Integration Tests)", () => {
  let app: INestApplication;

  let auditQueryPort: {
    findPaginated: jest.Mock;
  };

  let firebaseAuth: {
    verifyIdToken: jest.Mock;
  };

  let profileRepo: {
    findByUid: jest.Mock;
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
    "uid-recep": {
      uid: "uid-recep",
      email: "recep@clinic.example",
      display_name: "Recepcion",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    },
  };

  beforeEach(async () => {
    const mockAuditQueryPort = {
      findPaginated: jest.fn(),
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
      throw new UnauthorizedException("Token invalido");
    });

    mockProfileRepo.findByUid.mockImplementation(async (uid: string) => {
      return profilesByUid[uid as keyof typeof profilesByUid] ?? null;
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: OPERATIONAL_AUDIT_QUERY_PORT,
          useValue: mockAuditQueryPort,
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
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    auditQueryPort = module.get(OPERATIONAL_AUDIT_QUERY_PORT);
    firebaseAuth = module.get(FIREBASE_AUTH_PORT);
    profileRepo = module.get(PROFILE_REPOSITORY_TOKEN);

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it("should return paginated logs for admin with query filters", async () => {
    const createdAt = new Date("2026-04-05T14:21:18.000Z");
    auditQueryPort.findPaginated.mockResolvedValue({
      data: [
        {
          _id: "665a1b2c3d4e5f6a7b8c9d0e",
          action: "PROFILE_CREATED",
          actorUid: "uid-admin",
          targetUid: "uid-new",
          targetId: null,
          details: { role: "doctor", email: "dr@clinic.co" },
          timestamp: 1712345678000,
          createdAt,
        },
      ],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    const response = await request(app.getHttpServer())
      .get(
        "/audit-logs?action=PROFILE_CREATED&actorUid=uid-admin&from=1712300000000&to=1712400000000&page=2&limit=10",
      )
      .set("Authorization", "Bearer admin-token")
      .expect(200);

    expect(response.body).toEqual({
      data: [
        {
          id: "665a1b2c3d4e5f6a7b8c9d0e",
          action: "PROFILE_CREATED",
          actorUid: "uid-admin",
          targetUid: "uid-new",
          targetId: null,
          details: { role: "doctor", email: "dr@clinic.co" },
          timestamp: 1712345678000,
          createdAt: "2026-04-05T14:21:18.000Z",
        },
      ],
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1,
    });

    expect(auditQueryPort.findPaginated).toHaveBeenCalledWith(
      {
        action: "PROFILE_CREATED",
        actorUid: "uid-admin",
        from: 1712300000000,
        to: 1712400000000,
      },
      2,
      10,
    );
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith("admin-token");
    expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-admin");
  });

  it("should return 403 when non-admin role tries to read audit logs", async () => {
    await request(app.getHttpServer())
      .get("/audit-logs")
      .set("Authorization", "Bearer recep-token")
      .expect(403);

    expect(auditQueryPort.findPaginated).not.toHaveBeenCalled();
  });

  it("should return 401 when token is missing", async () => {
    await request(app.getHttpServer()).get("/audit-logs").expect(401);

    expect(firebaseAuth.verifyIdToken).not.toHaveBeenCalled();
    expect(auditQueryPort.findPaginated).not.toHaveBeenCalled();
  });

  it("should return 400 when action filter is invalid", async () => {
    await request(app.getHttpServer())
      .get("/audit-logs?action=INVALID_ACTION")
      .set("Authorization", "Bearer admin-token")
      .expect(400);

    expect(auditQueryPort.findPaginated).not.toHaveBeenCalled();
  });
});
