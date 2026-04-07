import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Server, Socket } from "socket.io";
import { WsFirebaseAuthGuard } from "src/auth/guards/ws-firebase-auth.guard";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { OperationalAppointmentsGateway } from "src/events/operational-appointments.gateway";
import { AppointmentEventPayload } from "src/types/appointment-event";

describe("OperationalAppointmentsGateway", () => {
  let gateway: OperationalAppointmentsGateway;
  let mockQueryUseCase: { findAll: jest.Mock };
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockWsFirebaseAuthGuard: jest.Mocked<WsFirebaseAuthGuard>;

  const makeClient = (overrides?: Partial<Socket>): jest.Mocked<Socket> => {
    return {
      id: "op-socket-id",
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    } as unknown as jest.Mocked<Socket>;
  };

  beforeEach(async () => {
    mockQueryUseCase = { findAll: jest.fn() };

    mockConfigService = {
      get: jest.fn().mockReturnValue("http://localhost:3001"),
      getOrThrow: jest.fn().mockReturnValue("http://localhost:3001"),
    } as unknown as jest.Mocked<ConfigService>;

    mockWsFirebaseAuthGuard = {
      authenticateSocket: jest.fn(),
      canActivate: jest.fn(),
    } as unknown as jest.Mocked<WsFirebaseAuthGuard>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationalAppointmentsGateway,
        { provide: "QueryAppointmentsUseCase", useValue: mockQueryUseCase },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WsFirebaseAuthGuard, useValue: mockWsFirebaseAuthGuard },
        // Transitive deps needed when @UseGuards resolves the guard class
        { provide: FIREBASE_AUTH_PORT, useValue: { verifyIdToken: jest.fn() } },
        {
          provide: PROFILE_REPOSITORY_TOKEN,
          useValue: { findByUid: jest.fn() },
        },
      ],
    })
      .overrideGuard(WsFirebaseAuthGuard)
      .useValue(mockWsFirebaseAuthGuard)
      .compile();

    gateway = module.get<OperationalAppointmentsGateway>(
      OperationalAppointmentsGateway,
    );

    gateway.server = {
      emit: jest.fn(),
    } as unknown as Server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(gateway).toBeDefined();
  });

  it("should throw on afterInit if FRONTEND_URL is missing", () => {
    mockConfigService.get.mockReturnValue(null);
    expect(() => gateway.afterInit()).toThrow(
      "FRONTEND_URL debe estar definido en .env",
    );
  });

  // ─── CRITERIO-1.1: authenticated client receives snapshot ───────────────────

  it("should emit APPOINTMENTS_SNAPSHOT to authenticated client on connection", async () => {
    // GIVEN
    const appointments: AppointmentEventPayload[] = [
      {
        id: "apt-001",
        fullName: "Paciente Demo",
        idCard: 123456,
        office: "3",
        status: "waiting",
        priority: "medium",
        timestamp: 1760000000,
        doctorId: null,
        doctorName: null,
      },
    ];
    const client = makeClient();
    mockWsFirebaseAuthGuard.authenticateSocket.mockResolvedValue(true);
    mockQueryUseCase.findAll.mockResolvedValue(appointments);

    // WHEN
    await gateway.handleConnection(client);

    // THEN
    expect(mockWsFirebaseAuthGuard.authenticateSocket).toHaveBeenCalledWith(
      client,
    );
    expect(mockQueryUseCase.findAll).toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith("APPOINTMENTS_SNAPSHOT", {
      type: "APPOINTMENTS_SNAPSHOT",
      data: appointments,
    });
  });

  // ─── CRITERIO-1.2 / 2.3: unauthenticated client is disconnected ─────────────

  it("should not emit snapshot and return early when auth fails", async () => {
    // GIVEN — guard already emits WS_AUTH_ERROR and disconnects the socket
    const client = makeClient();
    mockWsFirebaseAuthGuard.authenticateSocket.mockResolvedValue(false);

    // WHEN
    await gateway.handleConnection(client);

    // THEN
    expect(mockWsFirebaseAuthGuard.authenticateSocket).toHaveBeenCalledWith(
      client,
    );
    expect(mockQueryUseCase.findAll).not.toHaveBeenCalled();
    expect(client.emit).not.toHaveBeenCalledWith(
      "APPOINTMENTS_SNAPSHOT",
      expect.anything(),
    );
  });

  it("should handle snapshot query errors gracefully without crashing", async () => {
    // GIVEN
    const client = makeClient();
    mockWsFirebaseAuthGuard.authenticateSocket.mockResolvedValue(true);
    mockQueryUseCase.findAll.mockRejectedValue(new Error("DB unavailable"));

    // WHEN / THEN — must not throw
    await expect(gateway.handleConnection(client)).resolves.not.toThrow();
    expect(client.emit).not.toHaveBeenCalledWith(
      "APPOINTMENTS_SNAPSHOT",
      expect.anything(),
    );
  });

  // ─── broadcastAppointmentUpdated ────────────────────────────────────────────

  it("should broadcast APPOINTMENT_UPDATED to all operational clients", () => {
    // GIVEN
    const payload: AppointmentEventPayload = {
      id: "apt-001",
      fullName: "Paciente Demo",
      idCard: 123456,
      office: "3",
      status: "called",
      priority: "medium",
      timestamp: 1760000001,
      doctorId: "doctor-01",
      doctorName: "Dr. House",
    };

    // WHEN
    gateway.broadcastAppointmentUpdated(payload);

    // THEN
    expect(gateway.server.emit).toHaveBeenCalledWith("APPOINTMENT_UPDATED", {
      type: "APPOINTMENT_UPDATED",
      data: payload,
    });
  });
});
