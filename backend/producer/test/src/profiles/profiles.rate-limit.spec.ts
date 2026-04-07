import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { APP_GUARD, Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { ProfileView } from "src/domain/models/profile-view";
import { PROFILE_SERVICE_TOKEN } from "src/domain/ports/inbound/profile-service.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { ProfilesController } from "src/profiles/profiles.controller";
import request from "supertest";

describe("ProfilesController rate limiting (SPEC-006)", () => {
  let app: INestApplication;

  let profileService: {
    resolveSession: jest.Mock;
    createProfile: jest.Mock;
    listProfiles: jest.Mock;
    updateProfile: jest.Mock;
    initializeSelf: jest.Mock;
  };

  const adminProfile: ProfileView = {
    uid: "uid-admin",
    email: "admin@clinic.example",
    display_name: "Admin",
    role: "admin",
    status: "active",
    doctor_id: null,
  };

  beforeEach(async () => {
    profileService = {
      resolveSession: jest.fn(),
      createProfile: jest.fn(),
      listProfiles: jest.fn().mockResolvedValue({
        data: [adminProfile],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
        },
      }),
      updateProfile: jest.fn().mockResolvedValue({
        ...adminProfile,
        status: "inactive",
      }),
      initializeSelf: jest.fn(),
    };

    const firebaseAuth = {
      verifyIdToken: jest.fn().mockImplementation(async (token: string) => {
        if (token === "admin-token") {
          return { uid: "uid-admin" };
        }
        throw new UnauthorizedException("Token invalido");
      }),
    };

    const profileRepo = {
      findByUid: jest.fn().mockResolvedValue(adminProfile),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 100,
          },
        ]),
      ],
      controllers: [ProfilesController],
      providers: [
        {
          provide: PROFILE_SERVICE_TOKEN,
          useValue: profileService,
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
        {
          provide: OPERATIONAL_AUDIT_PORT,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
            hasRecentEntry: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: APP_GUARD,
          useClass: ThrottlerGuard,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it("returns 429 on GET /profiles when requests exceed 20 per minute", async () => {
    const server = app.getHttpServer();

    for (let i = 0; i < 20; i += 1) {
      await request(server)
        .get("/profiles")
        .set("Authorization", "Bearer admin-token")
        .expect(200);
    }

    const throttledResponse = await request(server)
      .get("/profiles")
      .set("Authorization", "Bearer admin-token")
      .expect(429);

    expect(throttledResponse.body.statusCode).toBe(429);
    expect(profileService.listProfiles).toHaveBeenCalledTimes(20);
  });

  it("returns 429 on PATCH /profiles/:uid when requests exceed 20 per minute", async () => {
    const server = app.getHttpServer();

    for (let i = 0; i < 20; i += 1) {
      await request(server)
        .patch("/profiles/uid-target")
        .set("Authorization", "Bearer admin-token")
        .send({ status: "inactive" })
        .expect(200);
    }

    const throttledResponse = await request(server)
      .patch("/profiles/uid-target")
      .set("Authorization", "Bearer admin-token")
      .send({ status: "inactive" })
      .expect(429);

    expect(throttledResponse.body.statusCode).toBe(429);
    expect(profileService.updateProfile).toHaveBeenCalledTimes(20);
  });
});
