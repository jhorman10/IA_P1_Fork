import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ProfileServiceImpl } from "src/application/use-cases/profile.service.impl";
import { ProfileView } from "src/domain/models/profile-view";
import { ProfileRepository } from "src/domain/ports/outbound/profile.repository";
import { ProfileAuditLogRepository } from "src/domain/ports/outbound/profile-audit-log.repository";

describe("ProfileServiceImpl", () => {
  let service: ProfileServiceImpl;
  let repo: jest.Mocked<ProfileRepository>;
  let auditLogRepo: jest.Mocked<ProfileAuditLogRepository>;

  const baseProfile: ProfileView = {
    uid: "uid-admin",
    email: "admin@clinic.example",
    display_name: "Admin",
    role: "admin",
    status: "active",
    doctor_id: null,
  };

  beforeEach(() => {
    repo = {
      findByUid: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProfileRepository>;

    auditLogRepo = {
      log: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<ProfileAuditLogRepository>;

    service = new ProfileServiceImpl(repo, auditLogRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should resolve session when profile exists and is active", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue(baseProfile);

    // WHEN
    const result = await service.resolveSession("uid-admin");

    // THEN
    expect(result).toEqual(baseProfile);
    expect(repo.findByUid).toHaveBeenCalledWith("uid-admin");
  });

  it("should throw ForbiddenException when profile does not exist", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue(null);

    // WHEN / THEN
    await expect(service.resolveSession("uid-missing")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should throw ForbiddenException when profile is inactive", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue({
      ...baseProfile,
      uid: "uid-inactive",
      status: "inactive",
    });

    // WHEN / THEN
    await expect(service.resolveSession("uid-inactive")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should create profile when data is valid and unique", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(null);
    repo.create.mockResolvedValue({
      ...baseProfile,
      uid: "uid-recep",
      email: "recep@clinic.example",
      display_name: "Recepción",
      role: "recepcionista",
    });

    // WHEN
    const result = await service.createProfile({
      uid: "uid-recep",
      email: "recep@clinic.example",
      displayName: "Recepción",
      role: "recepcionista",
    });

    // THEN
    expect(result.uid).toBe("uid-recep");
    expect(repo.create).toHaveBeenCalledWith({
      uid: "uid-recep",
      email: "recep@clinic.example",
      display_name: "Recepción",
      role: "recepcionista",
      doctor_id: null,
    });
  });

  it("should throw ConflictException when uid already exists", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue(baseProfile);
    repo.findByEmail.mockResolvedValue(null);

    // WHEN / THEN
    await expect(
      service.createProfile({
        uid: "uid-admin",
        email: "new@clinic.example",
        displayName: "Nuevo",
        role: "admin",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("should throw ConflictException when email already exists", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue(null);
    repo.findByEmail.mockResolvedValue(baseProfile);

    // WHEN / THEN
    await expect(
      service.createProfile({
        uid: "uid-new",
        email: "admin@clinic.example",
        displayName: "Nuevo",
        role: "admin",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("should throw BadRequestException when doctor role misses doctor_id", async () => {
    // WHEN / THEN
    await expect(
      service.createProfile({
        uid: "uid-doctor",
        email: "doctor@clinic.example",
        displayName: "Doctor",
        role: "doctor",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("should cap listProfiles limit at 100", async () => {
    // GIVEN
    repo.findAll.mockResolvedValue({
      data: [baseProfile],
      pagination: {
        page: 1,
        limit: 100,
        total: 1,
        total_pages: 1,
      },
    });

    // WHEN
    const result = await service.listProfiles({ page: 1, limit: 999 });

    // THEN
    expect(repo.findAll).toHaveBeenCalledWith({
      role: undefined,
      status: undefined,
      page: 1,
      limit: 100,
    });
    expect(result.pagination.total).toBe(1);
    expect(result.data).toHaveLength(1);
  });

  it("should throw NotFoundException when updating a missing profile", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue(null);

    // WHEN / THEN
    await expect(service.updateProfile("missing", {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should throw BadRequestException when role becomes doctor without doctor_id", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue({
      ...baseProfile,
      role: "recepcionista",
      doctor_id: null,
    });

    // WHEN / THEN
    await expect(
      service.updateProfile("uid-admin", { role: "doctor" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("should update profile when payload is valid", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue({
      ...baseProfile,
      role: "recepcionista",
      doctor_id: null,
    });
    repo.update.mockResolvedValue({
      ...baseProfile,
      role: "doctor",
      doctor_id: "doctor-1",
    });

    // WHEN
    const result = await service.updateProfile("uid-admin", {
      role: "doctor",
      doctorId: "doctor-1",
    });

    // THEN
    expect(repo.update).toHaveBeenCalledWith("uid-admin", {
      role: "doctor",
      status: undefined,
      doctor_id: "doctor-1",
    });
    expect(result.role).toBe("doctor");
    expect(result.doctor_id).toBe("doctor-1");
  });

  it("should throw NotFoundException when repository update returns null", async () => {
    // GIVEN
    repo.findByUid.mockResolvedValue(baseProfile);
    repo.update.mockResolvedValue(null);

    // WHEN / THEN
    await expect(
      service.updateProfile("uid-admin", { status: "inactive" }),
    ).rejects.toThrow(NotFoundException);
  });
});
