/**
 * SPEC-010: Tests for AuthenticatedSocketIoAdapter
 *
 * Verifies:
 * - auth.token is sent in the Socket.IO handshake
 * - Connects to /ws/operational-appointments namespace
 * - WS_AUTH_ERROR triggers onAuthRejected and then disconnects
 * - Full callback wiring and disconnect lifecycle
 */

jest.mock("socket.io-client", () => {
  const handlers: Record<string, (...args: unknown[]) => void> = {};
  const socket = {
    on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
      handlers[event] = cb;
      return socket;
    }),
    disconnect: jest.fn(),
    emit: (event: string, payload?: unknown) => handlers[event]?.(payload),
    __handlers: handlers,
  } as unknown;

  return {
    io: jest.fn(() => socket),
    __socket: socket,
  };
});

const setEnvSocket = () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
};

describe("AuthenticatedSocketIoAdapter", () => {
  beforeEach(() => {
    jest.resetModules();
    setEnvSocket();
  });

  it("passes auth.token in the Socket.IO handshake", async () => {
    const { AuthenticatedSocketIoAdapter } =
      await import("@/infrastructure/adapters/AuthenticatedSocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      io: jest.Mock;
    };

    const adapter = new AuthenticatedSocketIoAdapter();
    adapter.connect("test-firebase-token");

    expect(mockSocketModule.io).toHaveBeenCalledWith(
      "ws://ws.test/ws/operational-appointments",
      expect.objectContaining({
        auth: { token: "test-firebase-token" },
      }),
    );
  });

  it("connects to the operational namespace, not the public one", async () => {
    const { AuthenticatedSocketIoAdapter } =
      await import("@/infrastructure/adapters/AuthenticatedSocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      io: jest.Mock;
    };

    const adapter = new AuthenticatedSocketIoAdapter();
    adapter.connect("some-token");

    const callArg = mockSocketModule.io.mock.calls[0][0] as string;
    expect(callArg).toContain("/ws/operational-appointments");
    expect(callArg).not.toContain("/ws/appointments");
  });

  it("calls onAuthRejected and disconnects on WS_AUTH_ERROR event", async () => {
    const { AuthenticatedSocketIoAdapter } =
      await import("@/infrastructure/adapters/AuthenticatedSocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      __socket: { on: jest.Mock; disconnect: jest.Mock };
    };
    const socket = mockSocketModule.__socket;

    const adapter = new AuthenticatedSocketIoAdapter();
    const onAuthRejected = jest.fn();

    adapter.onAuthRejected(onAuthRejected);
    adapter.connect("expired-token");

    const authErrorHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "WS_AUTH_ERROR",
    )?.[1];

    authErrorHandler?.();

    expect(onAuthRejected).toHaveBeenCalledTimes(1);
    expect(adapter.isConnected()).toBe(false);
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it("wires all callbacks and handles full connect/snapshot/update/disconnect cycle", async () => {
    const { AuthenticatedSocketIoAdapter } =
      await import("@/infrastructure/adapters/AuthenticatedSocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      __socket: { on: jest.Mock; disconnect: jest.Mock };
    };
    const socket = mockSocketModule.__socket;

    const adapter = new AuthenticatedSocketIoAdapter();
    const onConnect = jest.fn();
    const onDisconnect = jest.fn();
    const onSnapshot = jest.fn();
    const onUpdate = jest.fn();
    const onError = jest.fn();
    const onAuthRejected = jest.fn();

    adapter.onConnect(onConnect);
    adapter.onDisconnect(onDisconnect);
    adapter.onSnapshot(onSnapshot);
    adapter.onAppointmentUpdated(onUpdate);
    adapter.onError(onError);
    adapter.onAuthRejected(onAuthRejected);

    adapter.connect("valid-token");

    const connectHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "connect",
    )?.[1];
    connectHandler?.();
    expect(adapter.isConnected()).toBe(true);
    expect(onConnect).toHaveBeenCalled();

    const snapshotHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "APPOINTMENTS_SNAPSHOT",
    )?.[1];
    snapshotHandler?.({ data: [{ id: "1" }] });
    expect(onSnapshot).toHaveBeenCalledWith([{ id: "1" }]);

    const updateHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "APPOINTMENT_UPDATED",
    )?.[1];
    updateHandler?.({ data: { id: "2" } });
    expect(onUpdate).toHaveBeenCalledWith({ id: "2" });

    const disconnectHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "disconnect",
    )?.[1];
    disconnectHandler?.("io client disconnect");
    expect(adapter.isConnected()).toBe(false);
    expect(onDisconnect).toHaveBeenCalled();

    adapter.disconnect();
    expect(socket.disconnect).toHaveBeenCalled();
  });

  it("does not call io() a second time when already connected", async () => {
    const { AuthenticatedSocketIoAdapter } =
      await import("@/infrastructure/adapters/AuthenticatedSocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      io: jest.Mock;
    };

    const adapter = new AuthenticatedSocketIoAdapter();
    adapter.connect("tok-1");
    adapter.connect("tok-2");

    expect(mockSocketModule.io).toHaveBeenCalledTimes(1);
  });

  it("propagates connection errors via onError callback", async () => {
    const { AuthenticatedSocketIoAdapter } =
      await import("@/infrastructure/adapters/AuthenticatedSocketIoAdapter");
    const mockSocketModule = (await import("socket.io-client")) as unknown as {
      __socket: { on: jest.Mock };
    };
    const socket = mockSocketModule.__socket;

    const adapter = new AuthenticatedSocketIoAdapter();
    const onError = jest.fn();

    adapter.onError(onError);
    adapter.connect("some-token");

    const errorHandler = socket.on.mock.calls.find(
      ([event]: [string]) => event === "connect_error",
    )?.[1];

    errorHandler?.(new Error("connection refused"));
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
