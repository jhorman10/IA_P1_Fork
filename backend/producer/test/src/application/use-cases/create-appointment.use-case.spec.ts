import { Test, TestingModule } from "@nestjs/testing";
import { CreateAppointmentUseCaseImpl } from "src/application/use-cases/create-appointment.use-case.impl";
import { AppointmentPublisherPort } from "src/domain/ports/outbound/appointment-publisher.port";
import { AppointmentReadRepository } from "src/domain/ports/outbound/appointment-read.repository";

/**
 * ⚕️ HUMAN CHECK - Test de Caso de Uso Hexagonal:
 * Testea la implementación del caso de uso, mockeando el puerto outbound.
 */
describe("CreateAppointmentUseCaseImpl", () => {
  let useCase: CreateAppointmentUseCaseImpl;
  let mockPublisher: jest.Mocked<AppointmentPublisherPort>;
  let mockReadRepository: jest.Mocked<AppointmentReadRepository>;

  beforeEach(async () => {
    mockPublisher = {
      publishAppointmentCreated: jest.fn(),
    } as unknown as jest.Mocked<AppointmentPublisherPort>;

    mockReadRepository = {
      findAll: jest.fn(),
      findByIdCard: jest.fn(),
      findWaiting: jest.fn(),
      findActiveByIdCard: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
    } as jest.Mocked<AppointmentReadRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAppointmentUseCaseImpl,
        {
          provide: "AppointmentPublisherPort",
          useValue: mockPublisher,
        },
        {
          provide: "AppointmentReadRepository",
          useValue: mockReadRepository,
        },
      ],
    }).compile();

    useCase = module.get<CreateAppointmentUseCaseImpl>(
      CreateAppointmentUseCaseImpl,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("execute - Success cases", () => {
    it("should publish appointment and return void (fire-and-forget)", async () => {
      const command = {
        idCard: 123456789,
        fullName: "John Doe",
        priority: "medium" as const,
      };

      await expect(useCase.execute(command)).resolves.not.toThrow();
      expect(mockReadRepository.findActiveByIdCard).toHaveBeenCalledWith(
        123456789,
      );
      expect(mockPublisher.publishAppointmentCreated).toHaveBeenCalledWith(
        command,
      );
    });
  });

  describe("execute - Error handling", () => {
    it("should throw error if publishing fails", async () => {
      const publishError = new Error("Publishing failed");
      mockPublisher.publishAppointmentCreated.mockRejectedValue(publishError);

      const createAppointmentDto = {
        idCard: 123456789,
        fullName: "John Doe",
        priority: "medium" as const,
      };

      await expect(useCase.execute(createAppointmentDto)).rejects.toThrow(
        "Publishing failed",
      );
    });
  });
});
