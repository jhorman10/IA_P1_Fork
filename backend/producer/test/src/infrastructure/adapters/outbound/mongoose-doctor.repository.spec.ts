import { ConflictException } from "@nestjs/common";
import { MongooseDoctorRepository } from "src/infrastructure/adapters/outbound/mongoose-doctor.repository";

describe("MongooseDoctorRepository", () => {
  let repository: MongooseDoctorRepository;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findOne: jest.Mock;
  };

  const validId = "507f1f77bcf86cd799439011";

  const doctorDoc = {
    _id: validId,
    name: "Dr. Repo",
    specialty: "Medicina General",
    office: null,
    status: "offline",
    createdAt: new Date("2026-04-07T10:00:00.000Z"),
    updatedAt: new Date("2026-04-07T10:00:00.000Z"),
  };

  beforeEach(() => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOne: jest.fn(),
    };

    repository = new MongooseDoctorRepository(model as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── save ──────────────────────────────────────────────────────────────────

  it("should persist specialtyId when saving a doctor", async () => {
    model.create.mockResolvedValue(doctorDoc);

    await repository.save({
      name: "Dr. Repo",
      specialty: "Medicina General",
      specialtyId: "spec-001",
      office: null,
    });

    expect(model.create).toHaveBeenCalledWith({
      name: "Dr. Repo",
      specialty: "Medicina General",
      specialtyId: "spec-001",
      status: "offline",
    });
  });

  it("should default specialtyId to null when not provided", async () => {
    model.create.mockResolvedValue(doctorDoc);

    await repository.save({
      name: "Dr. Repo",
      specialty: "Medicina General",
      office: null,
    });

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({ specialtyId: null, status: "offline" }),
    );
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  it("should find all doctors without filter and with status filter", async () => {
    model.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([doctorDoc]),
    });

    const all = await repository.findAll();
    expect(model.find).toHaveBeenCalledWith({});
    expect(all).toHaveLength(1);

    model.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([doctorDoc]),
    });
    const filtered = await repository.findAll("offline");
    expect(model.find).toHaveBeenCalledWith({ status: "offline" });
    expect(filtered[0].status).toBe("offline");
  });

  // ── findById ──────────────────────────────────────────────────────────────

  it("should return null for invalid id in findById", async () => {
    const result = await repository.findById("invalid-id");
    expect(result).toBeNull();
  });

  it("should return doc when findById matches", async () => {
    model.findById.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doctorDoc),
    });
    const result = await repository.findById(validId);
    expect(model.findById).toHaveBeenCalledWith(validId);
    expect(result).toMatchObject({ id: validId, name: "Dr. Repo" });
  });

  // ── findByOffice ──────────────────────────────────────────────────────────

  it("should find by office (active status filter) or return null", async () => {
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doctorDoc),
    });
    const found = await repository.findByOffice("1");
    expect(model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ office: "1" }),
    );
    expect(found).not.toBeNull();

    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const notFound = await repository.findByOffice("missing");
    expect(notFound).toBeNull();
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  it("should update status when id valid and return null when invalid", async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doctorDoc),
    });
    const updated = await repository.updateStatus(validId, "available");
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
      validId,
      { status: "available" },
      { new: true },
    );
    expect(updated).not.toBeNull();

    const invalid = await repository.updateStatus("bad-id", "offline");
    expect(invalid).toBeNull();
  });

  // ── updateStatusAndOffice ─────────────────────────────────────────────────

  it("should throw ConflictException when updateStatusAndOffice gets duplicate key error", async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });

    await expect(
      repository.updateStatusAndOffice(validId, "available", "3"),
    ).rejects.toThrow(ConflictException);
  });

  // ── updateSpecialty ───────────────────────────────────────────────────────

  it("should update specialty and specialtyId when both are provided", async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doctorDoc),
    });

    await repository.updateSpecialty(validId, "Pediatría", "spec-002");

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(validId, {
      specialty: "Pediatría",
      specialtyId: "spec-002",
    });
  });

  it("should update only specialty when specialtyId is undefined", async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(doctorDoc),
    });

    await repository.updateSpecialty(validId, "Cardiología");

    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(validId, {
      specialty: "Cardiología",
    });
  });

  it("should ignore invalid id in updateSpecialty", async () => {
    await expect(
      repository.updateSpecialty("bad-id", "X"),
    ).resolves.toBeUndefined();
  });
});
