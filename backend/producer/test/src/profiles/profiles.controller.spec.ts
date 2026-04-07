import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
  ValidationPipe,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { ProfileView } from "src/domain/models/profile-view";
import { PROFILE_SERVICE_TOKEN } from "src/domain/ports/inbound/profile-service.port";
import { SPECIALTY_SERVICE_TOKEN } from "src/domain/ports/inbound/specialty-service.port";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { OPERATIONAL_AUDIT_PORT } from "src/domain/ports/outbound/operational-audit.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { ProfilesController } from "src/profiles/profiles.controller";
import request from "supertest";

describe("ProfilesController (Integration Tests)", () => {
  let app: INestApplication;

  let profileService: {
    resolveSession: jest.Mock;
    createProfile: jest.Mock;
    listProfiles: jest.Mock;
    updateProfile: jest.Mock;
  };

  let firebaseAuth: {
    verifyIdToken: jest.Mock;
    createUser: jest.Mock;
  };

  let profileRepo: {
    findByUid: jest.Mock;
  };

  let doctorService: {
    createDoctor: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    checkIn: jest.Mock;
    checkOut: jest.Mock;
    getAvailableOffices: jest.Mock;
    updateSpecialty: jest.Mock;
  };

  let specialtyService: {
    findById: jest.Mock;
    createSpecialty: jest.Mock;
    listSpecialties: jest.Mock;
    updateSpecialty: jest.Mock;
    deleteSpecialty: jest.Mock;
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
      doctor_id: "doctor-1",
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
      createProfile: jest.fn(),
      listProfiles: jest.fn(),
      updateProfile: jest.fn(),
    };

    const mockFirebaseAuth = {
      verifyIdToken: jest.fn(),
      createUser: jest.fn(),
    };

    const mockProfileRepo = {
      findByUid: jest.fn(),
    };

    const mockDoctorService = {
      createDoctor: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      checkIn: jest.fn(),
      checkOut: jest.fn(),
      getAvailableOffices: jest.fn(),
      updateSpecialty: jest.fn(),
    };

    const mockSpecialtyService = {
      findById: jest.fn(),
      createSpecialty: jest.fn(),
      listSpecialties: jest.fn(),
      updateSpecialty: jest.fn(),
      deleteSpecialty: jest.fn(),
    };

    mockFirebaseAuth.verifyIdToken.mockImplementation(async (token: string) => {
      if (token === "admin-token") return { uid: "uid-admin" };
      if (token === "recep-token") return { uid: "uid-recep" };
      if (token === "doctor-token") return { uid: "uid-doctor" };
      if (token === "inactive-token") return { uid: "uid-inactive" };
      throw new UnauthorizedException("Token inválido");
    });
    mockFirebaseAuth.createUser.mockResolvedValue({ uid: "uid-created" });

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

    mockProfileService.createProfile.mockResolvedValue({
      uid: "uid-created",
      email: "doctor.new@clinic.example",
      display_name: "Doctor Nuevo",
      role: "doctor",
      status: "active",
      doctor_id: "doctor-10",
      createdAt: new Date("2026-04-05T10:00:00.000Z"),
      updatedAt: new Date("2026-04-05T10:00:00.000Z"),
    });

    mockProfileService.listProfiles.mockResolvedValue({
      data: [profilesByUid["uid-admin"]],
      total: 1,
    });

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [
        {
          provide: PROFILE_SERVICE_TOKEN,
          useValue: mockProfileService,
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
          // AuditInterceptor is applied on POST /profiles and PATCH /profiles/:uid
          provide: OPERATIONAL_AUDIT_PORT,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
            hasRecentEntry: jest.fn().mockResolvedValue(false),
          },
        },
        {
          provide: "DoctorService",
          useValue: mockDoctorService,
        },
        {
          provide: SPECIALTY_SERVICE_TOKEN,
          useValue: mockSpecialtyService,
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
    firebaseAuth = module.get(FIREBASE_AUTH_PORT);
    profileRepo = module.get(PROFILE_REPOSITORY_TOKEN);
    doctorService = module.get("DoctorService");
    specialtyService = module.get(SPECIALTY_SERVICE_TOKEN);

    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it("should create profile for admin role", async () => {
    // GIVEN
    specialtyService.findById.mockResolvedValueOnce({
      id: "spec-001",
      name: "Cardiología",
    });
    doctorService.createDoctor.mockResolvedValueOnce({
      id: "doctor-10",
      name: "Doctor Nuevo",
      specialty: "Cardiología",
      specialtyId: "spec-001",
      office: null,
      status: "offline",
    });

    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles")
      .set("Authorization", "Bearer admin-token")
      .send({
        email: "doctor.new@clinic.example",
        password: "SecureP@ss123",
        display_name: "Doctor Nuevo",
        role: "doctor",
        specialty_id: "spec-001",
      })
      .expect(201);

    // THEN
    expect(response.body).toMatchObject({
      uid: "uid-created",
      role: "doctor",
      status: "active",
      doctor_id: "doctor-10",
    });
    expect(profileService.createProfile).toHaveBeenCalledWith({
      uid: "uid-created",
      email: "doctor.new@clinic.example",
      displayName: "Doctor Nuevo",
      role: "doctor",
      doctorId: "doctor-10",
    });
    expect(firebaseAuth.createUser).toHaveBeenCalledWith(
      "doctor.new@clinic.example",
      "SecureP@ss123",
    );
    expect(specialtyService.findById).toHaveBeenCalledWith("spec-001");
    expect(doctorService.createDoctor).toHaveBeenCalledWith({
      name: "Doctor Nuevo",
      specialty: "Cardiología",
      specialtyId: "spec-001",
      office: null,
    });
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith("admin-token");
    expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-admin");
  });

  it("should return 403 when recepcionista tries to create a profile", async () => {
    // WHEN
    await request(app.getHttpServer())
      .post("/profiles")
      .set("Authorization", "Bearer recep-token")
      .send({
        uid: "uid-any",
        email: "any@clinic.example",
        display_name: "Any",
        role: "recepcionista",
      })
      .expect(403);

    // THEN
    expect(profileService.createProfile).not.toHaveBeenCalled();
  });

  it("should list profiles for admin and parse pagination query", async () => {
    // GIVEN — service returns ProfilePage shape
    profileService.listProfiles.mockResolvedValue({
      data: [profilesByUid["uid-admin"]],
      pagination: { page: 2, limit: 15, total: 1, total_pages: 1 },
    });

    // WHEN
    const response = await request(app.getHttpServer())
      .get("/profiles?role=admin&status=active&page=2&limit=15")
      .set("Authorization", "Bearer admin-token")
      .expect(200);

    // THEN
    expect(response.body.data).toHaveLength(1);
    expect(response.body.pagination).toEqual({
      page: 2,
      limit: 15,
      total: 1,
      total_pages: 1,
    });
    expect(profileService.listProfiles).toHaveBeenCalledWith({
      role: "admin",
      status: "active",
      page: 2,
      limit: 15,
    });
  });

  it("should return 403 when doctor tries to list profiles", async () => {
    // WHEN
    await request(app.getHttpServer())
      .get("/profiles")
      .set("Authorization", "Bearer doctor-token")
      .expect(403);

    // THEN
    expect(profileService.listProfiles).not.toHaveBeenCalled();
  });

  it("should return 401 when listing profiles without token", async () => {
    // WHEN
    await request(app.getHttpServer()).get("/profiles").expect(401);

    // THEN
    expect(profileService.listProfiles).not.toHaveBeenCalled();
  });

  it("should return 200 for /profiles/me when profile is active", async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .get("/profiles/me")
      .set("Authorization", "Bearer admin-token")
      .expect(200);

    // THEN
    expect(response.body).toMatchObject({
      uid: "uid-admin",
      email: "admin@clinic.example",
      display_name: "Admin",
      role: "admin",
      status: "active",
      doctor_id: null,
    });
    expect(profileService.resolveSession).toHaveBeenCalledWith("uid-admin");
  });

  it("should return 400 when creating doctor profile without specialty_id", async () => {
    // WHEN
    const response = await request(app.getHttpServer())
      .post("/profiles")
      .set("Authorization", "Bearer admin-token")
      .send({
        email: "doctor.nolink@clinic.example",
        password: "SecureP@ss123",
        display_name: "Doctor sin enlace",
        role: "doctor",
      })
      .expect(400);

    // THEN
    expect(response.body.message).toContain("specialty_id es obligatorio");
    expect(firebaseAuth.createUser).toHaveBeenCalledWith(
      "doctor.nolink@clinic.example",
      "SecureP@ss123",
    );
    expect(specialtyService.findById).not.toHaveBeenCalled();
    expect(doctorService.createDoctor).not.toHaveBeenCalled();
    expect(profileService.createProfile).not.toHaveBeenCalled();
  });

  it("should update profile for admin role", async () => {
    // GIVEN
    profileService.updateProfile.mockResolvedValueOnce({
      uid: "uid-doctor",
      email: "doctor@clinic.example",
      display_name: "Doctor",
      role: "doctor",
      status: "inactive",
      doctor_id: "doctor-1",
      createdAt: new Date("2026-04-05T10:00:00.000Z"),
      updatedAt: new Date("2026-04-06T10:00:00.000Z"),
    });

    // WHEN
    const response = await request(app.getHttpServer())
      .patch("/profiles/uid-doctor")
      .set("Authorization", "Bearer admin-token")
      .send({
        status: "inactive",
      })
      .expect(200);

    // THEN
    expect(response.body).toMatchObject({
      uid: "uid-doctor",
      role: "doctor",
      status: "inactive",
      doctor_id: "doctor-1",
    });
    expect(profileService.updateProfile).toHaveBeenCalledWith("uid-doctor", {
      role: undefined,
      status: "inactive",
      doctorId: undefined,
      changedBy: "uid-admin",
      reason: null,
    });
  });

  it("should return 404 when updating a missing profile", async () => {
    // GIVEN
    profileService.updateProfile.mockRejectedValueOnce(
      new NotFoundException("Perfil no encontrado"),
    );

    // WHEN
    const response = await request(app.getHttpServer())
      .patch("/profiles/uid-missing")
      .set("Authorization", "Bearer admin-token")
      .send({
        status: "inactive",
      })
      .expect(404);

    // THEN
    expect(response.body.message).toContain("Perfil no encontrado");
    expect(profileService.updateProfile).toHaveBeenCalledWith("uid-missing", {
      role: undefined,
      status: "inactive",
      doctorId: undefined,
      changedBy: "uid-admin",
      reason: null,
    });
  });

  it("should return 403 for inactive profile on /profiles/me", async () => {
    // WHEN
    await request(app.getHttpServer())
      .get("/profiles/me")
      .set("Authorization", "Bearer inactive-token")
      .expect(403);

    // THEN
    expect(profileService.resolveSession).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // SPEC-015 CRITERIO-1.2: PATCH /profiles/:uid with specialty_id
  // ─────────────────────────────────────────────────────────────────────────

  it("test_update_profile_specialty_200 — should update Doctor specialty when specialty_id is provided for doctor profile", async () => {
    // GIVEN
    const updatedProfile = {
      uid: "uid-doctor",
      email: "doctor@clinic.example",
      display_name: "Doctor",
      role: "doctor",
      status: "active",
      doctor_id: "doctor-1",
      createdAt: new Date("2026-04-05T10:00:00.000Z"),
      updatedAt: new Date("2026-04-06T10:00:00.000Z"),
    };
    profileService.updateProfile.mockResolvedValueOnce(updatedProfile);
    specialtyService.findById.mockResolvedValueOnce({
      id: "spec-001",
      name: "Pediatría",
    });
    doctorService.updateSpecialty.mockResolvedValueOnce({
      id: "doctor-1",
      name: "Doctor",
      specialty: "Pediatría",
      specialtyId: "spec-001",
      office: null,
      status: "offline",
    });

    // WHEN
    const response = await request(app.getHttpServer())
      .patch("/profiles/uid-doctor")
      .set("Authorization", "Bearer admin-token")
      .send({ specialty_id: "spec-001" })
      .expect(200);

    // THEN
    expect(response.body).toMatchObject({ uid: "uid-doctor", role: "doctor" });
    expect(specialtyService.findById).toHaveBeenCalledWith("spec-001");
    expect(doctorService.updateSpecialty).toHaveBeenCalledWith(
      "doctor-1",
      "Pediatría",
      "spec-001",
    );
  });

  it("test_update_profile_specialty_no_doctor_400 — should return 400 when doctor profile has no linked Doctor entity", async () => {
    // GIVEN — profile is doctor role but doctor_id is null (inconsistent state)
    const profileNoDoctorId = {
      uid: "uid-orphan",
      email: "orphan@clinic.example",
      display_name: "Orphan Doctor",
      role: "doctor" as const,
      status: "active" as const,
      doctor_id: null,
    };
    profileService.updateProfile.mockResolvedValueOnce(profileNoDoctorId);

    // WHEN
    const response = await request(app.getHttpServer())
      .patch("/profiles/uid-orphan")
      .set("Authorization", "Bearer admin-token")
      .send({ specialty_id: "spec-001" })
      .expect(400);

    // THEN
    expect(response.body.message).toContain("Doctor vinculado");
    expect(doctorService.updateSpecialty).not.toHaveBeenCalled();
  });

  it("test_update_profile_specialty_skipped_non_doctor — should NOT call updateSpecialty when final role is not doctor", async () => {
    // GIVEN — profile is recepcionista after update; specialty_id should be ignored
    const recepProfile = {
      uid: "uid-recep",
      email: "recep@clinic.example",
      display_name: "Recepción",
      role: "recepcionista" as const,
      status: "active" as const,
      doctor_id: null,
    };
    profileService.updateProfile.mockResolvedValueOnce(recepProfile);

    // WHEN
    const response = await request(app.getHttpServer())
      .patch("/profiles/uid-recep")
      .set("Authorization", "Bearer admin-token")
      .send({ role: "recepcionista", specialty_id: "spec-001" })
      .expect(200);

    // THEN
    expect(response.body.role).toBe("recepcionista");
    expect(doctorService.updateSpecialty).not.toHaveBeenCalled();
    expect(specialtyService.findById).not.toHaveBeenCalled();
  });

  it("test_update_profile_specialty_doctor_not_found_404 — should return 404 when doctor entity is not found during specialty update", async () => {
    // GIVEN
    const updatedProfile = {
      uid: "uid-doctor",
      email: "doctor@clinic.example",
      display_name: "Doctor",
      role: "doctor" as const,
      status: "active" as const,
      doctor_id: "doctor-missing",
    };
    profileService.updateProfile.mockResolvedValueOnce(updatedProfile);
    specialtyService.findById.mockResolvedValueOnce({
      id: "spec-001",
      name: "Pediatría",
    });
    doctorService.updateSpecialty.mockRejectedValueOnce(
      new NotFoundException("Médico con id doctor-missing no encontrado"),
    );

    // WHEN
    const response = await request(app.getHttpServer())
      .patch("/profiles/uid-doctor")
      .set("Authorization", "Bearer admin-token")
      .send({ specialty_id: "spec-001" })
      .expect(404);

    // THEN
    expect(response.body.message).toContain("doctor-missing");
  });
});
