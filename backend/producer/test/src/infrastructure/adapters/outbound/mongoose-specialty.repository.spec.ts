import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseSpecialtyRepository } from "src/infrastructure/adapters/outbound/mongoose-specialty.repository";
import { Doctor } from "src/schemas/doctor.schema";
import { Specialty } from "src/schemas/specialty.schema";

describe("MongooseSpecialtyRepository", () => {
  let repository: MongooseSpecialtyRepository;
  let model: {
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findByIdAndDelete: jest.Mock;
  };
  let doctorModel: { countDocuments: jest.Mock };

  const now = new Date("2026-04-05T10:00:00.000Z");
  const doc = { _id: "507f1f77bcf86cd799439011", name: "Cardiology", createdAt: now, updatedAt: now } as any;

  beforeEach(async () => {
    model = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };
    doctorModel = { countDocuments: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseSpecialtyRepository,
        { provide: getModelToken(Specialty.name), useValue: model },
        { provide: getModelToken(Doctor.name), useValue: doctorModel },
      ],
    }).compile();

    repository = module.get<MongooseSpecialtyRepository>(MongooseSpecialtyRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it("should find all specialties sorted", async () => {
    model.find.mockReturnValue({ sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue([doc]) });
    const all = await repository.findAll();
    expect(model.find).toHaveBeenCalled();
    expect(all[0].name).toBe("Cardiology");
  });

  it("should find by id and name or return null", async () => {
    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
    const byId = await repository.findById("507f1f77bcf86cd799439011");
    expect(byId?.id).toBe(String(doc._id));

    model.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const missing = await repository.findById("nope");
    expect(missing).toBeNull();

    model.findOne.mockReturnValue({ collation: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(doc) });
    const byName = await repository.findByName("Cardiology");
    expect(byName?.name).toBe("Cardiology");
  });

  it("should save and update specialties", async () => {
    model.create.mockResolvedValue(doc);
    const saved = await repository.save("Cardiology");
    expect(model.create).toHaveBeenCalledWith({ name: "Cardiology" });
    expect(saved.name).toBe("Cardiology");

    model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
    const updated = await repository.update(String(doc._id), "Cardiology II");
    expect(updated?.name).toBe("Cardiology");

    model.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const nullUpdate = await repository.update("nope", "X");
    expect(nullUpdate).toBeNull();
  });

  it("should delete and return boolean status", async () => {
    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
    const ok = await repository.delete(String(doc._id));
    expect(ok).toBe(true);

    model.findByIdAndDelete.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const no = await repository.delete("nope");
    expect(no).toBe(false);
  });

  it("should count doctors by specialty id", async () => {
    doctorModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(5) });
    const count = await repository.countDoctorsBySpecialtyId("s1");
    expect(count).toBe(5);
  });
});
