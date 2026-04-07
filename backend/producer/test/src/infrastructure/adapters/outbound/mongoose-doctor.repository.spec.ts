import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Types } from "mongoose";
import { MongooseDoctorRepository } from "src/infrastructure/adapters/outbound/mongoose-doctor.repository";
import { Doctor } from "src/schemas/doctor.schema";

describe("MongooseDoctorRepository", () => {
  let repository: MongooseDoctorRepository;
  let model: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };

  const now = new Date("2026-04-05T10:00:00.000Z");
  const doc = {
    _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
    name: "Dr Strange",
    specialty: "Magic",
    office: "1",
    status: "available",
    createdAt: now,
    updatedAt: now,
  } as any;

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseDoctorRepository,
        {
          provide: getModelToken(Doctor.name),
          useValue: model,
        },
      ],
    }).compile();

    repository = module.get<MongooseDoctorRepository>(MongooseDoctorRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should save a doctor with offline status", async () => {
    model.create.mockResolvedValue(doc);

    const res = await repository.save({ name: "Dr Strange", specialty: "Magic", office: "1" });

    expect(model.create).toHaveBeenCalledWith({
      name: "Dr Strange",
      specialty: "Magic",
      office: "1",
      status: "offline",
    });
    expect(res).toMatchObject({ name: "Dr Strange", specialty: "Magic", office: "1", status: "available" });
  });

  it("should find all doctors without filter and with status filter", async () => {
    model.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([doc]) });

    const all = await repository.findAll();
    expect(model.find).toHaveBeenCalledWith({});
    expect(all).toHaveLength(1);

    model.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([doc]) });
    const filtered = await repository.findAll("available");
    expect(model.find).toHaveBeenCalledWith({ status: "available" });
    expect(filtered[0].status).toBe("available");
  });

  it("should return null for invalid id in findById", async () => {
    const result = await repository.findById("invalid-id");
    expect(result).toBeNull();
  });

  it("should return doc when findById matches", async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
    const result = await repository.findById(String(doc._id));
    expect(model.findById).toHaveBeenCalledWith(String(doc._id));
    expect(result).toMatchObject({ id: String(doc._id), name: "Dr Strange" });
  });

  it("should find by office or return null", async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
    const found = await repository.findByOffice("1");
    expect(model.findOne).toHaveBeenCalledWith({ office: "1" });
    expect(found).not.toBeNull();

    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const notFound = await repository.findByOffice("missing");
    expect(notFound).toBeNull();
  });

  it("should update status when id valid and return null when invalid", async () => {
    model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
    const updated = await repository.updateStatus(String(doc._id), "available");
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(String(doc._id), { status: "available" }, { new: true });
    expect(updated).not.toBeNull();

    const invalid = await repository.updateStatus("bad-id", "offline");
    expect(invalid).toBeNull();
  });

  it("should update specialty when id valid and ignore invalid", async () => {
    model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
    await repository.updateSpecialty(String(doc._id), "Neurology");
    expect(model.findByIdAndUpdate).toHaveBeenCalledWith(String(doc._id), { specialty: "Neurology" });

    await expect(repository.updateSpecialty("bad-id", "X")).resolves.toBeUndefined();
  });
});
