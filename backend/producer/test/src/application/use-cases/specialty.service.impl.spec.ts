import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { SpecialtyServiceImpl } from "src/application/use-cases/specialty.service.impl";
import { SpecialtyView } from "src/domain/models/specialty-view";
import { SpecialtyRepository } from "src/domain/ports/outbound/specialty.repository";

describe("SpecialtyServiceImpl", () => {
  let service: SpecialtyServiceImpl;
  let repo: jest.Mocked<SpecialtyRepository>;

  const baseSpecialty: SpecialtyView = {
    id: "spec-001",
    name: "Cardiología",
    createdAt: new Date("2026-04-06T10:00:00Z"),
    updatedAt: new Date("2026-04-06T10:00:00Z"),
  };

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      countDoctorsBySpecialtyId: jest.fn(),
    } as jest.Mocked<SpecialtyRepository>;

    service = new SpecialtyServiceImpl(repo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createSpecialty
  // ─────────────────────────────────────────────────────────────────────────

  it("test_specialty_create_success — should create specialty when name is unique", async () => {
    // GIVEN
    repo.findByName.mockResolvedValue(null);
    repo.save.mockResolvedValue(baseSpecialty);

    // WHEN
    const result = await service.createSpecialty({ name: "Cardiología" });

    // THEN
    expect(result).toEqual(baseSpecialty);
    expect(repo.findByName).toHaveBeenCalledWith("Cardiología");
    expect(repo.save).toHaveBeenCalledWith("Cardiología");
  });

  it("test_specialty_create_duplicate_409 — should throw 409 when name already exists", async () => {
    // GIVEN
    repo.findByName.mockResolvedValue(baseSpecialty);

    // WHEN / THEN
    await expect(
      service.createSpecialty({ name: "Cardiología" }),
    ).rejects.toThrow(ConflictException);

    expect(repo.save).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findAll
  // ─────────────────────────────────────────────────────────────────────────

  it("should return all specialties", async () => {
    // GIVEN
    repo.findAll.mockResolvedValue([baseSpecialty]);

    // WHEN
    const result = await service.findAll();

    // THEN
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(baseSpecialty);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // findById
  // ─────────────────────────────────────────────────────────────────────────

  it("should return specialty by id", async () => {
    // GIVEN
    repo.findById.mockResolvedValue(baseSpecialty);

    // WHEN
    const result = await service.findById("spec-001");

    // THEN
    expect(result).toEqual(baseSpecialty);
  });

  it("should throw NotFoundException when specialty not found by id", async () => {
    // GIVEN
    repo.findById.mockResolvedValue(null);

    // WHEN / THEN
    await expect(service.findById("does-not-exist")).rejects.toThrow(
      NotFoundException,
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateSpecialty
  // ─────────────────────────────────────────────────────────────────────────

  it("should update specialty name when new name is unique", async () => {
    // GIVEN
    const updated = { ...baseSpecialty, name: "Medicina General" };
    repo.findById.mockResolvedValue(baseSpecialty);
    repo.findByName.mockResolvedValue(null);
    repo.update.mockResolvedValue(updated);

    // WHEN
    const result = await service.updateSpecialty(
      "spec-001",
      "Medicina General",
    );

    // THEN
    expect(result.name).toBe("Medicina General");
    expect(repo.update).toHaveBeenCalledWith("spec-001", "Medicina General");
  });

  it("should allow renaming to same name (idempotent update)", async () => {
    // GIVEN — findByName returns the same specialty being updated
    repo.findById.mockResolvedValue(baseSpecialty);
    repo.findByName.mockResolvedValue(baseSpecialty); // same id → not a duplicate
    repo.update.mockResolvedValue(baseSpecialty);

    // WHEN
    const result = await service.updateSpecialty("spec-001", "Cardiología");

    // THEN
    expect(result).toEqual(baseSpecialty);
    expect(repo.update).toHaveBeenCalled();
  });

  it("should throw 409 when new name conflicts with another specialty", async () => {
    // GIVEN — findByName returns a DIFFERENT specialty with the same name
    const other: SpecialtyView = {
      ...baseSpecialty,
      id: "spec-999",
      name: "Pediatría",
    };
    repo.findById.mockResolvedValue(baseSpecialty);
    repo.findByName.mockResolvedValue(other);

    // WHEN / THEN
    await expect(
      service.updateSpecialty("spec-001", "Pediatría"),
    ).rejects.toThrow(ConflictException);
  });

  it("should throw 404 when updating non-existent specialty", async () => {
    // GIVEN
    repo.findById.mockResolvedValue(null);

    // WHEN / THEN
    await expect(
      service.updateSpecialty("spec-999", "Geriatría"),
    ).rejects.toThrow(NotFoundException);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // deleteSpecialty
  // ─────────────────────────────────────────────────────────────────────────

  it("should delete specialty when no doctors are linked", async () => {
    // GIVEN
    repo.findById.mockResolvedValue(baseSpecialty);
    repo.countDoctorsBySpecialtyId.mockResolvedValue(0);
    repo.delete.mockResolvedValue(true);

    // WHEN
    await expect(service.deleteSpecialty("spec-001")).resolves.toBeUndefined();

    // THEN
    expect(repo.delete).toHaveBeenCalledWith("spec-001");
  });

  it("test_specialty_delete_with_doctors_400 — should throw 400 when doctors are linked", async () => {
    // GIVEN
    repo.findById.mockResolvedValue(baseSpecialty);
    repo.countDoctorsBySpecialtyId.mockResolvedValue(2);

    // WHEN / THEN
    await expect(service.deleteSpecialty("spec-001")).rejects.toThrow(
      BadRequestException,
    );

    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("should throw 404 when deleting non-existent specialty", async () => {
    // GIVEN
    repo.findById.mockResolvedValue(null);

    // WHEN / THEN
    await expect(service.deleteSpecialty("does-not-exist")).rejects.toThrow(
      NotFoundException,
    );
  });
});
