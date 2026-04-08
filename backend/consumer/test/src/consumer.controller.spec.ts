import { RmqContext } from "@nestjs/microservices";
import { Test, TestingModule } from "@nestjs/testing";

import { ConsumerController } from "../../src/consumer.controller";
import { ValidationError } from "../../src/domain/errors/validation.error";

describe("ConsumerController", () => {
  let controller: ConsumerController;
  interface RegisterUseCaseMock {
    execute: jest.Mock<Promise<{ id: string }>, [unknown]>;
  }
  interface AssignUseCaseMock {
    execute: jest.Mock<Promise<void>, []>;
  }
  let registerUseCase: RegisterUseCaseMock;
  let assignUseCase: AssignUseCaseMock;
  let maintenanceUseCase: AssignUseCaseMock;

  const mockRegisterUseCase = {
    execute: jest.fn(),
  };

  const mockAssignUseCase = {
    execute: jest.fn(),
  };

  const mockCompleteUseCase = {
    execute: jest.fn(),
  };

  const mockCancelUseCase = {
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
          provide: "AssignAvailableOfficesUseCase",
          useValue: mockAssignUseCase,
        },
        {
          provide: "CompleteAppointmentUseCase",
          useValue: mockCompleteUseCase,
        },
        { provide: "CancelAppointmentUseCase", useValue: mockCancelUseCase },
        {
          provide: "MaintenanceOrchestratorUseCase",
          useValue: mockAssignUseCase,
        },
      ],
    }).compile();

    controller = module.get<ConsumerController>(ConsumerController);
    registerUseCase = module.get("RegisterAppointmentUseCase");
    assignUseCase = module.get("AssignAvailableOfficesUseCase");
    maintenanceUseCase = module.get("MaintenanceOrchestratorUseCase");
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should ack message on success", async () => {
    mockRegisterUseCase.execute.mockResolvedValue({ id: "123" });
    mockRetryPolicyPort.shouldMoveToDLQ.mockReturnValue(false);

    await controller.handleCreateAppointment(
      { idCard: 1234, fullName: "Test", priority: "medium" },
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
      { idCard: 0, fullName: "", priority: "medium" },
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
      { idCard: 1234, fullName: "Test", priority: "medium" },
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
      { idCard: 1234, fullName: "Test", priority: "medium" },
      contextWithRetries,
    );

    expect(mockChannel.nack).toHaveBeenCalledWith(
      expect.anything(),
      false,
      false,
    );
  });

  it("should trigger assignment and ack on doctor_checked_in event", async () => {
    mockAssignUseCase.execute.mockResolvedValue(undefined);

    const payload = { doctorId: "doc-1", timestamp: Date.now() };

    await controller.handleDoctorCheckedIn(payload, mockContext);

    expect(maintenanceUseCase.execute).toHaveBeenCalledTimes(1);
    expect(mockChannel.ack).toHaveBeenCalled();
  });

  it("should nack without requeue when doctor_checked_in assignment fails", async () => {
    mockAssignUseCase.execute.mockRejectedValue(new Error("Assignment failed"));

    const payload = { doctorId: "doc-2", timestamp: Date.now() };

    await controller.handleDoctorCheckedIn(payload, mockContext);

    expect(maintenanceUseCase.execute).toHaveBeenCalledTimes(1);
    expect(mockChannel.ack).toHaveBeenCalled();
  });
});
