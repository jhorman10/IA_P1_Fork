import { BadRequestException, ConflictException } from "@nestjs/common";
import { Model } from "mongoose";
import { OfficeServiceImpl } from "src/application/use-cases/office.service.impl";
import { OfficeView } from "src/domain/models/office-view";
import { OfficeRepository } from "src/domain/ports/outbound/office.repository";
import { DoctorDocument } from "src/schemas/doctor.schema";

describe("OfficeServiceImpl", () => {
  let service: OfficeServiceImpl;
  let officeRepo: jest.Mocked<OfficeRepository>;
  let doctorModel: {
    find: jest.Mock;
    findOne: jest.Mock;
  };

  const officeFixture: OfficeView = {
    number: "2",
    enabled: true,
    createdAt: new Date("2026-04-06T10:00:00.000Z"),
    updatedAt: new Date("2026-04-06T10:00:00.000Z"),
  };

  beforeEach(() => {
    officeRepo = {
      findAll: jest.fn(),
      findByNumber: jest.fn(),
      findEnabledNumbers: jest.fn(),
      findMaxNumber: jest.fn(),
      createMany: jest.fn(),
      updateEnabled: jest.fn(),
    } as jest.Mocked<OfficeRepository>;

    doctorModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    service = new OfficeServiceImpl(
      officeRepo,
      doctorModel as unknown as Model<DoctorDocument>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should seed offices 1..5 when catalog is empty", async () => {
    officeRepo.findMaxNumber.mockResolvedValue(0);
    officeRepo.createMany.mockResolvedValue([]);

    await service.seedIfEmpty();

    expect(officeRepo.findMaxNumber).toHaveBeenCalledTimes(1);
    expect(officeRepo.createMany).toHaveBeenCalledWith([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });

  it("should return unchanged on adjustCapacity when target equals current max", async () => {
    officeRepo.findMaxNumber.mockResolvedValue(8);

    const result = await service.adjustCapacity({ targetTotal: 8 });

    expect(result).toEqual({
      targetTotal: 8,
      createdOffices: [],
      unchanged: true,
    });
    expect(officeRepo.createMany).not.toHaveBeenCalled();
  });

  it("should reject capacity reduction below current max", async () => {
    officeRepo.findMaxNumber.mockResolvedValue(8);

    await expect(service.adjustCapacity({ targetTotal: 6 })).rejects.toThrow(
      BadRequestException,
    );
    expect(officeRepo.createMany).not.toHaveBeenCalled();
  });

  it("should block disabling an occupied office", async () => {
    officeRepo.findByNumber.mockResolvedValue(officeFixture);
    doctorModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ _id: "doc-001" }),
    });

    await expect(service.updateEnabled("2", false)).rejects.toThrow(
      ConflictException,
    );

    expect(doctorModel.findOne).toHaveBeenCalledWith({
      office: "2",
      status: { $in: ["available", "busy"] },
    });
    expect(officeRepo.updateEnabled).not.toHaveBeenCalled();
  });
});
