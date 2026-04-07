import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { MongooseProfileRepository } from "src/infrastructure/adapters/outbound/mongoose-profile.repository";
import { Profile } from "src/schemas/profile.schema";

describe("MongooseProfileRepository", () => {
  let repository: MongooseProfileRepository;
  let model: {
    findOne: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    create: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  const profileDoc = {
    uid: "uid-admin",
    email: "admin@clinic.example",
    display_name: "Admin",
    role: "admin",
    status: "active",
    doctor_id: null,
    createdAt: new Date("2026-04-05T10:00:00.000Z"),
    updatedAt: new Date("2026-04-05T10:00:00.000Z"),
  };

  beforeEach(async () => {
    model = {
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      create: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseProfileRepository,
        {
          provide: getModelToken(Profile.name),
          useValue: model,
        },
      ],
    }).compile();

    repository = module.get<MongooseProfileRepository>(
      MongooseProfileRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should find profile by uid", async () => {
    // GIVEN
    model.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(profileDoc),
    });

    // WHEN
    const result = await repository.findByUid("uid-admin");

    // THEN
    expect(model.findOne).toHaveBeenCalledWith({ uid: "uid-admin" });
    expect(result).toMatchObject({
      uid: "uid-admin",
      email: "admin@clinic.example",
      role: "admin",
      status: "active",
    });
  });

  it("should return null when findByEmail does not match", async () => {
    // GIVEN
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    // WHEN
    const result = await repository.findByEmail("missing@clinic.example");

    // THEN
    expect(model.findOne).toHaveBeenCalledWith({
      email: "missing@clinic.example",
    });
    expect(result).toBeNull();
  });

  it("should return paginated profiles with filters", async () => {
    // GIVEN
    const findChain = {
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([profileDoc]),
    };
    model.find.mockReturnValue(findChain);
    model.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });

    // WHEN
    const result = await repository.findAll({
      role: "admin",
      status: "active",
      page: 2,
      limit: 10,
    });

    // THEN
    expect(model.find).toHaveBeenCalledWith({
      role: "admin",
      status: "active",
    });
    expect(findChain.skip).toHaveBeenCalledWith(10);
    expect(findChain.limit).toHaveBeenCalledWith(10);
    expect(result.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 1,
      total_pages: 1,
    });
  });

  it("should create profile with active status by default", async () => {
    // GIVEN
    model.create.mockResolvedValue(profileDoc);

    // WHEN
    const result = await repository.create({
      uid: "uid-admin",
      email: "admin@clinic.example",
      display_name: "Admin",
      role: "admin",
      doctor_id: null,
    });

    // THEN
    expect(model.create).toHaveBeenCalledWith({
      uid: "uid-admin",
      email: "admin@clinic.example",
      display_name: "Admin",
      role: "admin",
      doctor_id: null,
      status: "active",
    });
    expect(result?.status).toBe("active");
  });

  it("should update profile and return null when profile does not exist", async () => {
    // GIVEN
    model.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    // WHEN
    const result = await repository.update("uid-missing", {
      status: "inactive",
    });

    // THEN
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { uid: "uid-missing" },
      { $set: { status: "inactive" } },
      { new: true },
    );
    expect(result).toBeNull();
  });
});
