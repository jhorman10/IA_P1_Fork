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
      office: null,
      status: "offline",
    });
  });

  it("should throw ConflictException when updateStatusAndOffice gets duplicate key error", async () => {
    model.findByIdAndUpdate.mockReturnValue({
      exec: jest.fn().mockRejectedValue({ code: 11000 }),
    });

    await expect(
      repository.updateStatusAndOffice(validId, "available", "3"),
    ).rejects.toThrow(ConflictException);
  });

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
});