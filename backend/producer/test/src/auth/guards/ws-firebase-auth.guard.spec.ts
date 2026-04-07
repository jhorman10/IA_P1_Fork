import { ExecutionContext } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { Socket } from "socket.io";
import { WsFirebaseAuthGuard } from "src/auth/guards/ws-firebase-auth.guard";
import { ProfileView } from "src/domain/models/profile-view";
import {
  FIREBASE_AUTH_PORT,
  FirebaseAuthPort,
} from "src/domain/ports/outbound/firebase-auth.port";
import {
  PROFILE_REPOSITORY_TOKEN,
  ProfileRepository,
} from "src/domain/ports/outbound/profile.repository";

describe("WsFirebaseAuthGuard", () => {
  let guard: WsFirebaseAuthGuard;
  let firebaseAuth: jest.Mocked<FirebaseAuthPort>;
  let profileRepo: jest.Mocked<ProfileRepository>;

  const activeProfile: ProfileView = {
    uid: "uid-doctor-01",
    email: "doctor@clinic.example",
    display_name: "Dr. House",
    role: "doctor",
    status: "active",
    doctor_id: "doctor-01",
  };

  const makeSocket = (
    overrides?: Record<string, unknown>,
  ): jest.Mocked<Socket> => {
    return {
      id: "test-socket-id",
      handshake: { auth: {}, headers: {} },
      data: {},
      emit: jest.fn(),
      disconnect: jest.fn(),
      ...overrides,
    } as unknown as jest.Mocked<Socket>;
  };

  const makeContext = (client: Socket): ExecutionContext => {
    return {
      getType: () => "ws",
      switchToWs: () => ({ getClient: () => client }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    firebaseAuth = {
      verifyIdToken: jest.fn(),
    } as unknown as jest.Mocked<FirebaseAuthPort>;

    profileRepo = {
      findByUid: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<ProfileRepository>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsFirebaseAuthGuard,
        { provide: FIREBASE_AUTH_PORT, useValue: firebaseAuth },
        { provide: PROFILE_REPOSITORY_TOKEN, useValue: profileRepo },
      ],
    }).compile();

    guard = module.get<WsFirebaseAuthGuard>(WsFirebaseAuthGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(guard).toBeDefined();
  });

  // ─── Happy Path ─────────────────────────────────────────────────────────────

  describe("CRITERIO-1.1: valid idToken with active Profile", () => {
    it("should accept connection, attach user to client.data, and return true", async () => {
      // GIVEN
      const client = makeSocket({
        handshake: {
          auth: { token: "valid-firebase-token" },
          headers: {},
        },
      });
      firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-doctor-01" });
      profileRepo.findByUid.mockResolvedValue(activeProfile);

      // WHEN
      const result = await guard.canActivate(makeContext(client));

      // THEN
      expect(result).toBe(true);
      expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith(
        "valid-firebase-token",
      );
      expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-doctor-01");
      expect(client.data["user"]).toEqual({
        uid: "uid-doctor-01",
        role: "doctor",
        status: "active",
        doctor_id: "doctor-01",
      });
      expect(client.emit).not.toHaveBeenCalledWith(
        "WS_AUTH_ERROR",
        expect.anything(),
      );
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it("should accept token from Authorization Bearer header as fallback", async () => {
      // GIVEN
      const client = makeSocket({
        handshake: {
          auth: {},
          headers: { authorization: "Bearer bearer-token-123" },
        },
      });
      firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-doctor-01" });
      profileRepo.findByUid.mockResolvedValue(activeProfile);

      // WHEN
      const result = await guard.canActivate(makeContext(client));

      // THEN
      expect(result).toBe(true);
      expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith(
        "bearer-token-123",
      );
    });
  });

  // ─── Error Paths ─────────────────────────────────────────────────────────────

  describe("CRITERIO-1.2 / 1.3: token absent or invalid", () => {
    it("should reject when no token is provided", async () => {
      // GIVEN
      const client = makeSocket({
        handshake: { auth: {}, headers: {} },
      });

      // WHEN
      const result = await guard.canActivate(makeContext(client));

      // THEN
      expect(result).toBe(false);
      expect(firebaseAuth.verifyIdToken).not.toHaveBeenCalled();
      expect(client.emit).toHaveBeenCalledWith("WS_AUTH_ERROR", {
        type: "WS_AUTH_ERROR",
        code: "UNAUTHORIZED",
        message: "Token de autenticación requerido",
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("should reject and disconnect when Firebase rejects the token", async () => {
      // GIVEN
      const client = makeSocket({
        handshake: {
          auth: { token: "expired-token" },
          headers: {},
        },
      });
      firebaseAuth.verifyIdToken.mockRejectedValue(
        new Error("Firebase: token expired"),
      );

      // WHEN
      const result = await guard.canActivate(makeContext(client));

      // THEN
      expect(result).toBe(false);
      expect(client.emit).toHaveBeenCalledWith("WS_AUTH_ERROR", {
        type: "WS_AUTH_ERROR",
        code: "UNAUTHORIZED",
        message: "Token inválido o expirado",
      });
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe("CRITERIO-1.2: valid token but Profile absent or inactive", () => {
    it("should reject when Profile does not exist", async () => {
      // GIVEN
      const client = makeSocket({
        handshake: {
          auth: { token: "valid-token" },
          headers: {},
        },
      });
      firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-no-profile" });
      profileRepo.findByUid.mockResolvedValue(null);

      // WHEN
      const result = await guard.canActivate(makeContext(client));

      // THEN
      expect(result).toBe(false);
      expect(client.emit).toHaveBeenCalledWith("WS_AUTH_ERROR", {
        type: "WS_AUTH_ERROR",
        code: "FORBIDDEN",
        message: "Perfil operativo no configurado",
      });
      expect(client.disconnect).toHaveBeenCalled();
    });

    it("should reject when Profile exists but is inactive", async () => {
      // GIVEN
      const client = makeSocket({
        handshake: {
          auth: { token: "valid-token" },
          headers: {},
        },
      });
      firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-inactive" });
      profileRepo.findByUid.mockResolvedValue({
        ...activeProfile,
        uid: "uid-inactive",
        status: "inactive",
      });

      // WHEN
      const result = await guard.canActivate(makeContext(client));

      // THEN
      expect(result).toBe(false);
      expect(client.emit).toHaveBeenCalledWith("WS_AUTH_ERROR", {
        type: "WS_AUTH_ERROR",
        code: "FORBIDDEN",
        message: "Perfil inactivo",
      });
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  // ─── authenticateSocket (direct call from handleConnection) ─────────────────

  it("authenticateSocket should work identically to canActivate", async () => {
    // GIVEN
    const client = makeSocket({
      handshake: {
        auth: { token: "valid-firebase-token" },
        headers: {},
      },
    });
    firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-doctor-01" });
    profileRepo.findByUid.mockResolvedValue(activeProfile);

    // WHEN
    const result = await guard.authenticateSocket(client);

    // THEN
    expect(result).toBe(true);
    expect(client.data["user"]).toMatchObject({ uid: "uid-doctor-01" });
  });
});
