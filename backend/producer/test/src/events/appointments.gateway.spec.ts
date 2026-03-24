import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Server, Socket } from "socket.io";

import { AppointmentsGateway } from "../../../src/events/appointments.gateway";
import { AppointmentEventPayload } from "../../../src/types/appointment-event";

describe("AppointmentsGateway", () => {
  let gateway: AppointmentsGateway;
  let mockQueryUseCase: { findAll: jest.Mock };
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockQueryUseCase = {
      findAll: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue("http://localhost:3001"),
      getOrThrow: jest.fn().mockReturnValue("http://localhost:3001"),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsGateway,
        {
          provide: "QueryAppointmentsUseCase",
          useValue: mockQueryUseCase,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    gateway = module.get<AppointmentsGateway>(AppointmentsGateway);

    // Mock the WebSocket server
    gateway.server = {
      emit: jest.fn(),
    } as unknown as Server;
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  // HUMAN CHECK: Critical test - ensures gateway fails fast if FRONTEND_URL is not configured
  it("should throw error on init if FRONTEND_URL is not defined", () => {
    mockConfigService.get.mockReturnValue(null);

    expect(() => gateway.afterInit()).toThrow(
      "FRONTEND_URL debe estar definido en .env",
    );
  });

  it("should initialize successfully with FRONTEND_URL", () => {
    mockConfigService.get.mockReturnValue("http://localhost:3001");

    expect(() => gateway.afterInit()).not.toThrow();
  });

  // HUMAN CHECK: Critical test - ensures snapshot is sent to new clients on connection
  it("should send snapshot to client on connection", async () => {
    const mockAppointments = [
      {
        id: "1",
        fullName: "John Doe",
        idCard: 12345678,
        status: "waiting",
      },
      {
        id: "2",
        fullName: "Jane Smith",
        idCard: 87654321,
        status: "called",
      },
    ];

    mockQueryUseCase.findAll.mockResolvedValue(mockAppointments);

    const mockClient = {
      id: "test-client-id",
      emit: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(mockClient);

    expect(mockQueryUseCase.findAll).toHaveBeenCalled();
    expect(mockClient.emit).toHaveBeenCalledWith("APPOINTMENTS_SNAPSHOT", {
      type: "APPOINTMENTS_SNAPSHOT",
      data: mockAppointments,
    });
  });

  it("should handle connection errors gracefully", async () => {
    mockQueryUseCase.findAll.mockRejectedValue(
      new Error("Database connection failed"),
    );

    const mockClient = {
      id: "test-client-id",
      emit: jest.fn(),
    } as unknown as Socket;

    // Should not throw
    await expect(gateway.handleConnection(mockClient)).resolves.not.toThrow();
    expect(mockClient.emit).not.toHaveBeenCalled();
  });

  it("should handle non-Error exceptions in connection", async () => {
    mockQueryUseCase.findAll.mockRejectedValue("String error");

    const mockClient = {
      id: "test-client-id",
      emit: jest.fn(),
    } as unknown as Socket;

    await expect(gateway.handleConnection(mockClient)).resolves.not.toThrow();
  });

  it("should log disconnection", () => {
    const mockClient = {
      id: "test-client-id",
    } as unknown as Socket;

    // Should not throw
    expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
  });

  // HUMAN CHECK: Critical test - ensures broadcast sends events to all connected clients
  it("should broadcast appointment update to all clients", () => {
    const appointmentPayload: AppointmentEventPayload = {
      id: "123",
      fullName: "John Doe",
      idCard: 12345678,
      status: "called" as const,
      office: "1",
      priority: "high" as const,
      timestamp: Date.now(),
    };

    gateway.broadcastAppointmentUpdated(appointmentPayload);

    expect(gateway.server.emit).toHaveBeenCalledWith("APPOINTMENT_UPDATED", {
      type: "APPOINTMENT_UPDATED",
      data: appointmentPayload,
    });
  });

  it("should broadcast with correct event structure", () => {
    const appointmentPayload: AppointmentEventPayload = {
      id: "456",
      fullName: "Jane Smith",
      idCard: 87654321,
      status: "waiting" as const,
      office: null,
      priority: "low" as const,
      timestamp: 1000,
    };

    gateway.broadcastAppointmentUpdated(appointmentPayload);

    const [eventName, eventData] = (gateway.server.emit as jest.Mock).mock
      .calls[0];
    expect(eventName).toBe("APPOINTMENT_UPDATED");
    expect(eventData.type).toBe("APPOINTMENT_UPDATED");
    expect(eventData.data).toEqual(appointmentPayload);
  });

  it("should handle null office in broadcast", () => {
    const appointmentPayload: AppointmentEventPayload = {
      id: "789",
      fullName: "Test Patient",
      idCard: 11111111,
      status: "waiting" as const,
      office: null,
      priority: "medium" as const,
      timestamp: 2000,
    };

    expect(() =>
      gateway.broadcastAppointmentUpdated(appointmentPayload),
    ).not.toThrow();
  });

  it("should send empty snapshot if no appointments exist", async () => {
    mockQueryUseCase.findAll.mockResolvedValue([]);

    const mockClient = {
      id: "test-client-id",
      emit: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(mockClient);

    expect(mockClient.emit).toHaveBeenCalledWith("APPOINTMENTS_SNAPSHOT", {
      type: "APPOINTMENTS_SNAPSHOT",
      data: [],
    });
  });

  it("should call queryUseCase only once per connection", async () => {
    mockQueryUseCase.findAll.mockResolvedValue([]);

    const mockClient = {
      id: "test-client-id",
      emit: jest.fn(),
    } as unknown as Socket;

    await gateway.handleConnection(mockClient);

    expect(mockQueryUseCase.findAll).toHaveBeenCalledTimes(1);
  });
});
