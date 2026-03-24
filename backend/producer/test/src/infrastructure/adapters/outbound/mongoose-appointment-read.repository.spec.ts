import { NotFoundException } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { MongooseAppointmentReadRepository } from "../../../../../src/infrastructure/adapters/outbound/mongoose-appointment-read.repository";
import { Appointment } from "../../../../../src/schemas/appointment.schema";

const buildDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: "abc123",
  fullName: "John Doe",
  idCard: 1234567,
  office: "1",
  status: "waiting",
  priority: "medium",
  timestamp: 1000,
  completedAt: null,
  ...overrides,
});

describe("MongooseAppointmentReadRepository", () => {
  let repository: MongooseAppointmentReadRepository;
  let mockModel: {
    find: jest.Mock;
    sort: jest.Mock;
    exec: jest.Mock;
  };

  const execChain = (results: unknown[]) => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(results),
    };
    return chain;
  };

  beforeEach(async () => {
    mockModel = {
      find: jest.fn(),
      sort: jest.fn(),
      exec: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseAppointmentReadRepository,
        {
          provide: getModelToken(Appointment.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<MongooseAppointmentReadRepository>(
      MongooseAppointmentReadRepository,
    );
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("findAll", () => {
    it("should return all appointments mapped to payload", async () => {
      const chain = execChain([
        buildDoc(),
        buildDoc({ _id: "xyz456", idCard: 9876543 }),
      ]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAll();

      expect(mockModel.find).toHaveBeenCalledWith();
      expect(chain.sort).toHaveBeenCalledWith({ timestamp: 1 });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("abc123");
      expect(result[0].fullName).toBe("John Doe");
      expect(result[0].idCard).toBe(1234567);
    });

    it("should return empty array when no appointments", async () => {
      const chain = execChain([]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAll();
      expect(result).toHaveLength(0);
    });

    it("should map completedAt to undefined when absent", async () => {
      const chain = execChain([buildDoc({ completedAt: null })]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAll();
      // completedAt is optional in AppointmentEventPayload — undefined when not set
      expect(result[0].completedAt == null).toBe(true);
    });

    it("should map completedAt correctly when present", async () => {
      const chain = execChain([buildDoc({ completedAt: 9999 })]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAll();
      expect(result[0].completedAt).toBe(9999);
    });

    it("should map office to null when absent", async () => {
      const chain = execChain([buildDoc({ office: null })]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findAll();
      expect(result[0].office).toBeNull();
    });
  });

  describe("findByIdCard", () => {
    it("should return appointments for a valid idCard", async () => {
      const chain = execChain([buildDoc()]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findByIdCard(1234567);

      expect(mockModel.find).toHaveBeenCalledWith({ idCard: 1234567 });
      expect(chain.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(1);
      expect(result[0].idCard).toBe(1234567);
    });

    it("should return multiple appointments for the same idCard", async () => {
      const chain = execChain([buildDoc(), buildDoc({ _id: "def789" })]);
      mockModel.find.mockReturnValue(chain);

      const result = await repository.findByIdCard(1234567);
      expect(result).toHaveLength(2);
    });

    // HUMAN CHECK: NotFoundException debe lanzarse cuando no existen turnos para la cédula
    it("should throw NotFoundException when no appointments found", async () => {
      const chain = execChain([]);
      mockModel.find.mockReturnValue(chain);

      await expect(repository.findByIdCard(9999999)).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.findByIdCard(9999999)).rejects.toThrow(
        "No appointments found for ID card 9999999",
      );
    });
  });
});
