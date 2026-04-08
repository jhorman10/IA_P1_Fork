import { RmqContext } from "@nestjs/microservices";
import { Test, TestingModule } from "@nestjs/testing";

import { ConsumerController } from "../../src/consumer.controller";
import { ValidationError } from "../../src/domain/errors/validation.error";

describe("ConsumerController", () => {
  let controller: ConsumerController;
  interface RegisterUseCaseMock {
    execute: jest.Mock<Promise<{ id: string }>, [unknown]>;
  }
  let registerUseCase: RegisterUseCaseMock;

  const mockRegisterUseCase = {
    execute: jest.fn(),
  };

  const mockChannel = {
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockContext = {
    getChannelRef: () => mockChannel,
    getMessage: () => ({
      properties: { headers: {} },
    }),
  } as unknown as RmqContext;

  let mockRetryPolicyPort: {
    shouldMoveToDLQ: jest.Mock;
    getMaxRetries: jest.Mock;
  };
  beforeEach(async () => {
    jest.clearAllMocks();
    mockRetryPolicyPort = {
      shouldMoveToDLQ: jest.fn(),
      getMaxRetries: jest.fn().mockReturnValue(3),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsumerController],
      providers: [
        {
          provide: "RegisterAppointmentUseCase",
          useValue: mockRegisterUseCase,
        },
        { provide: "RetryPolicyPort", useValue: mockRetryPolicyPort },
        {
          provide: "CompleteAppointmentUseCase",
          useValue: { execute: jest.fn() },
        },
        {
          provide: "CancelAppointmentUseCase",
          useValue: { execute: jest.fn() },
        },
        {
          provide: "MaintenanceOrchestratorUseCase",
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ConsumerController>(ConsumerController);
    registerUseCase = module.get("RegisterAppointmentUseCase");
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should ack message on success", async () => {
    mockRegisterUseCase.execute.mockResolvedValue({ id: "123" });
    mockRetryPolicyPort.shouldMoveToDLQ.mockReturnValue(false);

    await controller.handleCreateAppointment(
      { idCard: 1234, fullName: "Test" },
      mockContext,
    );

    expect(registerUseCase.execute).toHaveBeenCalled();
    expect(mockChannel.ack).toHaveBeenCalled();
  });

  it("should nack and move to DLQ on ValidationError (fatal)", async () => {
    mockRegisterUseCase.execute.mockRejectedValue(
      new ValidationError("Invalid data"),
    );
    mockRetryPolicyPort.shouldMoveToDLQ.mockReturnValue(true);

    await controller.handleCreateAppointment(
      { idCard: 0, fullName: "" },
      mockContext,
    );

    expect(mockChannel.nack).toHaveBeenCalledWith(
      expect.anything(),
      false,
      false,
    );
  });

  it("should nack and requeue on transient error", async () => {
    mockRegisterUseCase.execute.mockRejectedValue(new Error("Transient Error"));
    mockRetryPolicyPort.shouldMoveToDLQ.mockReturnValue(false);

    await controller.handleCreateAppointment(
      { idCard: 1234, fullName: "Test" },
      mockContext,
    );

    expect(mockChannel.nack).toHaveBeenCalledWith(
      expect.anything(),
      false,
      true,
    );
  });

  it("should nack and move to DLQ on max retries", async () => {
    const contextWithRetries = {
      getChannelRef: () => mockChannel,
      getMessage: () => ({
        properties: {
          headers: {
            "x-death": [{ count: 2 }],
          },
        },
      }),
    } as unknown as RmqContext;

    mockRegisterUseCase.execute.mockRejectedValue(
      new Error("Persistent Error"),
    );
    mockRetryPolicyPort.shouldMoveToDLQ.mockReturnValue(true);

    await controller.handleCreateAppointment(
      { idCard: 1234, fullName: "Test" },
      contextWithRetries,
    );

    expect(mockChannel.nack).toHaveBeenCalledWith(
      expect.anything(),
      false,
      false,
    );
  });
});
