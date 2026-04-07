import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseOfficeRepository } from "src/infrastructure/adapters/outbound/mongoose-office.repository";
import { Office } from "src/schemas/office.schema";

describe("MongooseOfficeRepository", () => {
  let repository: MongooseOfficeRepository;
  let model: {
    find: jest.Mock;
    findOne: jest.Mock;
    insertMany: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  const now = new Date("2026-04-05T10:00:00.000Z");
  const docs = [
    { number: "1", enabled: true, createdAt: now, updatedAt: now },
    { number: "10", enabled: false, createdAt: now, updatedAt: now },
    { number: "2", enabled: true, createdAt: now, updatedAt: now },
  ];

  beforeEach(async () => {
    model = {
      find: jest.fn(),
      findOne: jest.fn(),
      insertMany: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseOfficeRepository,
        { provide: getModelToken(Office.name), useValue: model },
      ],
    }).compile();

    repository = module.get<MongooseOfficeRepository>(MongooseOfficeRepository);
  });

  afterEach(() => jest.clearAllMocks());

  it("should return all offices sorted by number", async () => {
    const chain = { sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(docs) };
    model.find.mockReturnValue(chain);

    const all = await repository.findAll();
    expect(model.find).toHaveBeenCalled();
    expect(chain.sort).toHaveBeenCalledWith({ number: 1 });
    expect(all).toHaveLength(3);
  });

  it("should find by number or return null", async () => {
    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(docs[0]) });
    const found = await repository.findByNumber("1");
    expect(model.findOne).toHaveBeenCalledWith({ number: "1" });
    expect(found?.number).toBe("1");

    model.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const missing = await repository.findByNumber("x");
    expect(missing).toBeNull();
  });

  it("should return enabled numbers sorted numerically", async () => {
    const chain = { sort: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(docs.filter((d) => d.enabled).map((d) => ({ number: d.number }))) };
    // chain of find({enabled:true}, {number:1}).sort({number:1}).exec()
    model.find.mockReturnValue(chain);

    const enabled = await repository.findEnabledNumbers();
    expect(enabled).toEqual(["1", "2"]);
  });

  it("should return max number or 0 when empty", async () => {
    model.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });
    const maxEmpty = await repository.findMaxNumber();
    expect(maxEmpty).toBe(0);

    model.find.mockReturnValue({ exec: jest.fn().mockResolvedValue([{ number: "3" }, { number: "12" }]) });
    const max = await repository.findMaxNumber();
    expect(max).toBe(12);
  });

  it("should create many offices and map to views", async () => {
    model.insertMany.mockResolvedValue([{ number: "1", enabled: true, createdAt: now, updatedAt: now }]);
    const created = await repository.createMany(["1"]);
    expect(model.insertMany).toHaveBeenCalledWith([{ number: "1", enabled: true }]);
    expect(created[0].number).toBe("1");
  });

  it("should update enabled and return null when not found", async () => {
    model.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(docs[0]) });
    const updated = await repository.updateEnabled("1", false);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith({ number: "1" }, { $set: { enabled: false } }, { new: true });
    expect(updated?.number).toBe("1");

    model.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const missing = await repository.updateEnabled("x", true);
    expect(missing).toBeNull();
  });
});
