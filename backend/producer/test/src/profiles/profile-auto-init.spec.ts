import {
  ConflictException,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { FirebaseTokenOnlyGuard } from "src/auth/guards/firebase-token-only.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { PROFILE_SERVICE_TOKEN } from "src/domain/ports/inbound/profile-service.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { ProfilesController } from "src/profiles/profiles.controller";
import request from "supertest";

/**
 * SPEC-006: Integration tests for POST /profiles/self/initialize.
 * Covers: 201 created, 409 conflict, 401 unauthorized, 400 validation, 403 no-uid.
 */
describe("ProfilesController — POST /profiles/self/initialize (SPEC-006)", () => {
  let app: INestApplication;

  let profileService: {
    resolveSession: jest.Mock;
    createProfile: jest.Mock;
    listProfiles: jest.Mock;
    updateProfile: jest.Mock;
    initializeSelf: jest.Mock;
  };

  let firebaseAuth: {
    verifyIdToken: jest.Mock;
  };

  const validBody = {
    email: "newuser@clinic.local",
    display_name: "New User",
    role: "recepcionista",
  };

  const createdProfile = {
    uid: "uid-new",
    email: "newuser@clinic.local",
    display_name: "New User",
    role: "recepcionista",
    status: "active",
    doctor_id: null,
    createdAt: new Date("2026-04-06T10:00:00.000Z"),
    updatedAt: new Date("2026-04-06T10:00:00.000Z"),
  };

  beforeEach(async () => {
    profileService = {
      resolveSession: jest.fn(),
      createProfile: jest.fn(),
      listProfiles: jest.fn(),
      updateProfile: jest.fn(),
      initializeSelf: jest.fn().mockResolvedValue(createdProfile),
    };

    firebaseAuth = {
      verifyIdToken: jest.fn().mockImplementation(async (token: string) => {
        if (token === "new-user-token") return { uid: "uid-new" };
        throw new UnauthorizedException("Token inválido");
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: PROFILE_SERVICE_TOKEN,
          useValue: profileService,
        },
        FirebaseAuthGuard,
        FirebaseTokenOnlyGuard,
        RoleGuard,
        Reflector,
        {
          provide: FIREBASE_AUTH_PORT,
          useValue: firebaseAuth,
        },
        {
          // FirebaseAuthGuard requires PROFILE_REPOSITORY_TOKEN at init time
          provide: PROFILE_REPOSITORY_TOKEN,
          useValue: { findByUid: jest.fn().mockResolvedValue(null) },
        },
        {
          // AuditInterceptor is applied on POST /profiles and PATCH /profiles/:uid
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
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
    jest.clearAllMocks();
  });

  it("should return 201 and the created profile when user has no profile yet", async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send(validBody)
      .expect(201);

    // THEN
    expect(response.body).toMatchObject({
      uid: "uid-new",
      email: "newuser@clinic.local",
      display_name: "New User",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    });
    expect(profileService.initializeSelf).toHaveBeenCalledWith(
      "uid-new",
      "newuser@clinic.local",
      "New User",
      "recepcionista",
    );
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith("new-user-token");
  });

  it("should default role to recepcionista when role is omitted", async () => {
    // GIVEN
    const bodyWithoutRole = {
      email: validBody.email,
      display_name: validBody.display_name,
    };

    // WHEN
    await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send(bodyWithoutRole)
      .expect(201);

    // THEN
    expect(profileService.initializeSelf).toHaveBeenCalledWith(
      "uid-new",
      "newuser@clinic.local",
      "New User",
      undefined,
    );
  });

  it("should return 409 when profile already exists", async () => {
    // GIVEN
    profileService.initializeSelf.mockRejectedValueOnce(
      new ConflictException("Ya existe un Perfil para este Usuario"),
    );

    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send(validBody)
      .expect(409);

    // THEN
    expect(response.body.message).toContain("Ya existe un Perfil");
  });

  it("should return 401 when Authorization header is missing", async () => {
    // WHEN
    await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .send(validBody)
      .expect(401);

    // THEN
    expect(profileService.initializeSelf).not.toHaveBeenCalled();
  });

  it("should return 401 when Bearer token is invalid", async () => {
    // WHEN
    await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer invalid-token")
      .send(validBody)
      .expect(401);

    // THEN
    expect(profileService.initializeSelf).not.toHaveBeenCalled();
  });

  it("should return 403 when token is valid but uid is missing", async () => {
    // GIVEN
    firebaseAuth.verifyIdToken.mockResolvedValueOnce({});

    // WHEN
    await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send(validBody)
      .expect(403);

    // THEN
    expect(profileService.initializeSelf).not.toHaveBeenCalled();
  });

  it("should return 400 when email is missing", async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send({ display_name: "Name Only" })
      .expect(400);

    // THEN
    expect(response.body.message).toBeDefined();
    expect(profileService.initializeSelf).not.toHaveBeenCalled();
  });

  it("should return 400 when display_name is missing", async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send({ email: "test@clinic.local" })
      .expect(400);

    // THEN
    expect(response.body.message).toBeDefined();
    expect(profileService.initializeSelf).not.toHaveBeenCalled();
  });

  it("should return 400 when role is admin (forbidden self-assignment)", async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send({ ...validBody, role: "admin" })
      .expect(400);

    // THEN
    expect(response.body.message).toBeDefined();
    expect(profileService.initializeSelf).not.toHaveBeenCalled();
  });

  it("should allow role doctor for self-initialization", async () => {
    // GIVEN
    profileService.initializeSelf.mockResolvedValueOnce({
      ...createdProfile,
      role: "doctor",
    });

    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send({ ...validBody, role: "doctor" })
      .expect(201);

    // THEN
    expect(response.body.role).toBe("doctor");
    expect(profileService.initializeSelf).toHaveBeenCalledWith(
      "uid-new",
      "newuser@clinic.local",
      "New User",
      "doctor",
    );
  });

  it("should return 400 if unknown fields are sent (forbidNonWhitelisted)", async () => {
    // WHEN
    await request(app.getHttpServer())
      .post("/profiles/self/initialize")
      .set("Authorization", "Bearer new-user-token")
      .send({ ...validBody, unknown_field: "value" })
      .expect(400);
  });
});
