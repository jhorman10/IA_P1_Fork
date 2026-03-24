import { ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { Socket } from "socket.io";

import { WsAuthGuard } from "../../../../src/common/guards/ws-auth.guard";

describe("WsAuthGuard", () => {
  let guard: WsAuthGuard;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      getOrThrow: jest.fn().mockReturnValue("test-secret-token"),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<WsAuthGuard>(WsAuthGuard);
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  // HUMAN CHECK: Critical security test - ensures guard loads token in constructor (fail-fast)
  it("should fail-fast if WS_AUTH_TOKEN is not defined", () => {
    mockConfigService.getOrThrow.mockImplementation(() => {
      throw new Error("WS_AUTH_TOKEN environment variable is required");
    });

    expect(() => new WsAuthGuard(mockConfigService)).toThrow(
      "WS_AUTH_TOKEN environment variable is required",
    );
  });

  it("should allow non-WebSocket contexts", () => {
    const mockContext = {
      getType: jest.fn().mockReturnValue("http"),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
  });

  // HUMAN CHECK: Critical security test - validates token from auth field
  it("should allow WebSocket connection with valid token in auth", () => {
    const mockClient = {
      handshake: {
        auth: { token: "test-secret-token" },
        headers: {},
      },
      disconnect: jest.fn(),
      id: "test-client-id",
    } as unknown as Socket;

    const mockContext = {
      getType: jest.fn().mockReturnValue("ws"),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockClient),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockClient.disconnect).not.toHaveBeenCalled();
  });

  // HUMAN CHECK: Critical security test - validates token from authorization header
  it("should allow WebSocket connection with valid token in authorization header", () => {
    const mockClient = {
      handshake: {
        auth: {},
        headers: { authorization: "test-secret-token" },
      },
      disconnect: jest.fn(),
      id: "test-client-id",
    } as unknown as Socket;

    const mockContext = {
      getType: jest.fn().mockReturnValue("ws"),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockClient),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockClient.disconnect).not.toHaveBeenCalled();
  });

  // HUMAN CHECK: Critical security test - rejects invalid tokens and disconnects client
  it("should reject WebSocket connection with invalid token", () => {
    const mockClient = {
      handshake: {
        auth: { token: "wrong-token" },
        headers: {},
      },
      disconnect: jest.fn(),
      id: "test-client-id",
    } as unknown as Socket;

    const mockContext = {
      getType: jest.fn().mockReturnValue("ws"),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockClient),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(false);
    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("should reject WebSocket connection with missing token", () => {
    const mockClient = {
      handshake: {
        auth: {},
        headers: {},
      },
      disconnect: jest.fn(),
      id: "test-client-id",
    } as unknown as Socket;

    const mockContext = {
      getType: jest.fn().mockReturnValue("ws"),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockClient),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(false);
    expect(mockClient.disconnect).toHaveBeenCalled();
  });

  it("should prioritize auth.token over authorization header", () => {
    const mockClient = {
      handshake: {
        auth: { token: "test-secret-token" },
        headers: { authorization: "wrong-token" },
      },
      disconnect: jest.fn(),
      id: "test-client-id",
    } as unknown as Socket;

    const mockContext = {
      getType: jest.fn().mockReturnValue("ws"),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue(mockClient),
      }),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(mockContext);

    expect(result).toBe(true);
    expect(mockClient.disconnect).not.toHaveBeenCalled();
  });
});
