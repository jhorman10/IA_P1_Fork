import { Test, TestingModule } from "@nestjs/testing";

import { RabbitMQPublisherAdapter } from "../../../../../src/infrastructure/adapters/outbound/rabbitmq-publisher.adapter";
import { CreateAppointmentDto } from "../../../../../src/dto/create-appointment.dto";

describe("RabbitMQPublisherAdapter", () => {
  let adapter: RabbitMQPublisherAdapter;
  let mockClientProxy: { emit: jest.Mock };

  beforeEach(async () => {
    mockClientProxy = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQPublisherAdapter,
        {
          provide: "APPOINTMENTS_SERVICE",
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    adapter = module.get<RabbitMQPublisherAdapter>(RabbitMQPublisherAdapter);
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  // HUMAN CHECK: Critical test - ensures messages are published to RabbitMQ
  it("should publish appointment created event", async () => {
    const dto: CreateAppointmentDto = {
      fullName: "John Doe",
      idCard: 12345678,
    };

    await adapter.publishAppointmentCreated(dto);

    expect(mockClientProxy.emit).toHaveBeenCalledWith(
      "create_appointment",
      dto,
    );
  });

  it("should publish with correct event name", async () => {
    const dto: CreateAppointmentDto = {
      fullName: "Jane Smith",
      idCard: 87654321,
    };

    await adapter.publishAppointmentCreated(dto);

    const [eventName] = mockClientProxy.emit.mock.calls[0];
    expect(eventName).toBe("create_appointment");
  });

  it("should publish with full DTO data", async () => {
    const dto: CreateAppointmentDto = {
      fullName: "John Doe",
      idCard: 12345678,
    };

    await adapter.publishAppointmentCreated(dto);

    const [, payload] = mockClientProxy.emit.mock.calls[0];
    expect(payload).toEqual(dto);
    expect(payload.fullName).toBe("John Doe");
    expect(payload.idCard).toBe(12345678);
  });

  // HUMAN CHECK: Error handling test - ensures errors are logged and re-thrown
  it("should throw error if RabbitMQ publish fails", async () => {
    const error = new Error("RabbitMQ connection failed");
    mockClientProxy.emit.mockImplementation(() => {
      throw error;
    });

    const dto: CreateAppointmentDto = {
      fullName: "John Doe",
      idCard: 12345678,
    };

    await expect(adapter.publishAppointmentCreated(dto)).rejects.toThrow(
      "RabbitMQ connection failed",
    );
  });

  it("should handle non-Error exceptions", async () => {
    mockClientProxy.emit.mockImplementation(() => {
      throw "String error";
    });

    const dto: CreateAppointmentDto = {
      fullName: "John Doe",
      idCard: 12345678,
    };

    await expect(adapter.publishAppointmentCreated(dto)).rejects.toBe(
      "String error",
    );
  });

  it("should call emit exactly once per publish", async () => {
    const dto: CreateAppointmentDto = {
      fullName: "John Doe",
      idCard: 12345678,
    };

    await adapter.publishAppointmentCreated(dto);

    expect(mockClientProxy.emit).toHaveBeenCalledTimes(1);
  });

  it("should support multiple sequential publishes", async () => {
    const dto1: CreateAppointmentDto = {
      fullName: "John Doe",
      idCard: 12345678,
    };
    const dto2: CreateAppointmentDto = {
      fullName: "Jane Smith",
      idCard: 87654321,
    };

    await adapter.publishAppointmentCreated(dto1);
    await adapter.publishAppointmentCreated(dto2);

    expect(mockClientProxy.emit).toHaveBeenCalledTimes(2);
    expect(mockClientProxy.emit).toHaveBeenNthCalledWith(
      1,
      "create_appointment",
      dto1,
    );
    expect(mockClientProxy.emit).toHaveBeenNthCalledWith(
      2,
      "create_appointment",
      dto2,
    );
  });
});
