import { ConflictException, NotFoundException } from "@nestjs/common";
import { ProfileServiceImpl } from "src/application/use-cases/profile.service.impl";
import { ProfileView } from "src/domain/models/profile-view";
import { ProfileRepository } from "src/domain/ports/outbound/profile.repository";
import { ProfileAuditLogRepository } from "src/domain/ports/outbound/profile-audit-log.repository";

/**
 * SPEC-006: Unit tests for ProfileServiceImpl — initializeSelf() and
 * profile audit log emission in updateProfile().
 */
describe("ProfileServiceImpl — SPEC-006", () => {
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

  const recepProfile: ProfileView = {
    uid: "uid-recep",
    email: "recep@clinic.local",
    display_name: "Recep",
    role: "recepcionista",
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
    } as jest.Mocked<ProfileRepository>;

    auditLogRepo = {
      log: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<ProfileAuditLogRepository>;

    service = new ProfileServiceImpl(repo, auditLogRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── initializeSelf ────────────────────────────────────────────────────────

  describe("initializeSelf()", () => {
    it("should create profile with default recepcionista role when role is omitted", async () => {
      // GIVEN
      repo.findByUid.mockResolvedValue(null);
      repo.create.mockResolvedValue(recepProfile);

      // WHEN
      const result = await service.initializeSelf(
        "uid-recep",
        "recep@clinic.local",
        "Recep",
      );

      // THEN
      expect(result.role).toBe("recepcionista");
      expect(repo.create).toHaveBeenCalledWith({
        uid: "uid-recep",
        email: "recep@clinic.local",
        display_name: "Recep",
        role: "recepcionista",
        doctor_id: null,
      });
    });

    it("should create profile with doctor role when explicitly provided", async () => {
      // GIVEN
      const doctorProfile: ProfileView = {
        ...recepProfile,
        uid: "uid-doc",
        email: "doc@clinic.local",
        role: "doctor",
      };
      repo.findByUid.mockResolvedValue(null);
      repo.create.mockResolvedValue(doctorProfile);

      // WHEN
      const result = await service.initializeSelf(
        "uid-doc",
        "doc@clinic.local",
        "Doctor",
        "doctor",
      );

      // THEN
      expect(result.role).toBe("doctor");
      expect(repo.create).toHaveBeenCalledWith({
        uid: "uid-doc",
        email: "doc@clinic.local",
        display_name: "Doctor",
        role: "doctor",
        doctor_id: null,
      });
    });

    it("should throw ConflictException when profile already exists", async () => {
      // GIVEN
      repo.findByUid.mockResolvedValue(baseProfile);

      // WHEN / THEN
      await expect(
        service.initializeSelf("uid-admin", "admin@clinic.example", "Admin"),
      ).rejects.toThrow(ConflictException);

      expect(repo.create).not.toHaveBeenCalled();
    });

    it("should not call auditLogRepo on initializeSelf", async () => {
      // GIVEN
      repo.findByUid.mockResolvedValue(null);
      repo.create.mockResolvedValue(recepProfile);

      // WHEN
      await service.initializeSelf("uid-recep", "recep@clinic.local", "Recep");

      // THEN — audit log is NOT expected for self-init (handled by operational audit interceptor)
      expect(auditLogRepo.log).not.toHaveBeenCalled();
    });
  });

  // ─── updateProfile audit log ───────────────────────────────────────────────

  describe("updateProfile() — audit log", () => {
    it("should persist profile_audit_log entry when changedBy is provided", async () => {
      // GIVEN
      const existing: ProfileView = {
        ...baseProfile,
        uid: "uid-recep",
        role: "recepcionista",
        status: "active",
      };
      const updated: ProfileView = { ...existing, status: "inactive" };
      repo.findByUid.mockResolvedValue(existing);
      repo.update.mockResolvedValue(updated);

      // WHEN
      await service.updateProfile("uid-recep", {
        status: "inactive",
        changedBy: "uid-admin",
        reason: "Baja temporal",
      });

      // Allow fire-and-forget to settle
      await new Promise((r) => setTimeout(r, 0));

      // THEN
      expect(auditLogRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({
          profileUid: "uid-recep",
          changedBy: "uid-admin",
          before: { role: "recepcionista", status: "active", doctor_id: null },
          after: { role: "recepcionista", status: "inactive", doctor_id: null },
          reason: "Baja temporal",
        }),
      );
    });

    it("should NOT persist audit log when changedBy is absent", async () => {
      // GIVEN
      repo.findByUid.mockResolvedValue(baseProfile);
      repo.update.mockResolvedValue({ ...baseProfile, status: "inactive" });

      // WHEN
      await service.updateProfile("uid-admin", { status: "inactive" });
      await new Promise((r) => setTimeout(r, 0));

      // THEN
      expect(auditLogRepo.log).not.toHaveBeenCalled();
    });

    it("should use null reason when omitted", async () => {
      // GIVEN
      repo.findByUid.mockResolvedValue(baseProfile);
      repo.update.mockResolvedValue({ ...baseProfile, role: "recepcionista" });

      // WHEN
      await service.updateProfile("uid-admin", {
        role: "recepcionista",
        changedBy: "uid-super",
      });
      await new Promise((r) => setTimeout(r, 0));

      // THEN
      expect(auditLogRepo.log).toHaveBeenCalledWith(
        expect.objectContaining({ reason: null }),
      );
    });

    it("should swallow audit log errors without throwing", async () => {
      // GIVEN
      repo.findByUid.mockResolvedValue(baseProfile);
      repo.update.mockResolvedValue({ ...baseProfile, status: "inactive" });
      auditLogRepo.log.mockRejectedValueOnce(new Error("DB unavailable"));
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      // WHEN — should NOT throw
      await expect(
        service.updateProfile("uid-admin", {
          status: "inactive",
          changedBy: "uid-super",
        }),
      ).resolves.toBeDefined();

      await new Promise((r) => setTimeout(r, 0));

      // THEN — error was logged as warning, not thrown
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("profile audit log failed"),
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });

    it("should throw NotFoundException when profile does not exist", async () => {
      // GIVEN
      repo.findByUid.mockResolvedValue(null);

      // WHEN / THEN
      await expect(
        service.updateProfile("uid-missing", { status: "inactive" }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
