import {
  ForbiddenException,
  INestApplication,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "src/auth/auth.controller";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { AuditInterceptor } from "src/common/interceptors/audit.interceptor";
import { ProfileView } from "src/domain/models/profile-view";
import { PROFILE_SERVICE_TOKEN } from "src/domain/ports/inbound/profile-service.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import request from "supertest";

describe("AuthController (Integration Tests)", () => {
  let app: INestApplication;

  let profileService: {
    resolveSession: jest.Mock;
  };

  let firebaseAuth: {
    verifyIdToken: jest.Mock;
  };

  let profileRepo: {
    findByUid: jest.Mock;
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
    "uid-inactive": {
      uid: "uid-inactive",
      email: "inactive@clinic.example",
      display_name: "Inactive",
      role: "doctor",
      status: "inactive",
      doctor_id: "doctor-1",
    },
  };

  beforeEach(async () => {
    const mockProfileService = {
      resolveSession: jest.fn(),
    };

    const mockFirebaseAuth = {
      verifyIdToken: jest.fn(),
    };

    const mockProfileRepo = {
      findByUid: jest.fn(),
    };

    mockFirebaseAuth.verifyIdToken.mockImplementation(async (token: string) => {
      if (token === "admin-token") return { uid: "uid-admin" };
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
        if (!profile)
          throw new ForbiddenException("Perfil operativo no configurado");
        if (profile.status !== "active") {
          throw new ForbiddenException("Perfil inactivo");
        }
        return profile;
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: PROFILE_SERVICE_TOKEN,
          useValue: mockProfileService,
        },
        FirebaseAuthGuard,
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

    profileService = module.get(PROFILE_SERVICE_TOKEN);
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

  it("should resolve session with active profile and return allowed modules", async () => {
    // GIVEN
    profileService.resolveSession.mockResolvedValue(profilesByUid["uid-admin"]);

    // WHEN
    const response = await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer admin-token")
      .send({})
      .expect(200);

    // THEN
    expect(response.body).toEqual({
      uid: "uid-admin",
      email: "admin@clinic.example",
      display_name: "Admin",
      role: "admin",
      status: "active",
      doctor_id: null,
      allowed_modules: ["dashboard", "registration", "doctors", "profiles"],
    });
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith("admin-token");
    expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-admin");
    expect(profileService.resolveSession).toHaveBeenCalledWith("uid-admin");
  });

  it("should return 401 when token is missing", async () => {
    // WHEN
    await request(app.getHttpServer())
      .post("/auth/session")
      .send({})
      .expect(401);

    // THEN
    expect(firebaseAuth.verifyIdToken).not.toHaveBeenCalled();
    expect(profileService.resolveSession).not.toHaveBeenCalled();
  });

  it("should return 403 when token is valid but profile is missing", async () => {
    // WHEN
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer missing-profile-token")
      .send({})
      .expect(403);

    // THEN
    expect(profileService.resolveSession).not.toHaveBeenCalled();
  });

  it("should return 403 when profile is inactive", async () => {
    // WHEN
    await request(app.getHttpServer())
      .post("/auth/session")
      .set("Authorization", "Bearer inactive-token")
      .send({})
      .expect(403);

    // THEN
    expect(profileService.resolveSession).not.toHaveBeenCalled();
  });
});
