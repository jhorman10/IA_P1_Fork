import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FirebaseAuthAdapter } from "src/infrastructure/adapters/outbound/firebase-auth.adapter";

jest.mock("firebase-admin", () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn(),
  },
}));

const admin = require("firebase-admin");

describe("FirebaseAuthAdapter", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    admin.apps = [];
    admin.initializeApp.mockReset();
    admin.credential.cert.mockReset();
    admin.credential.applicationDefault.mockReset();
  });

  it("e2e mode: accepts e2e:: tokens and rejects malformed ones", async () => {
    const config = { get: (k: string) => (k === "NODE_ENV" ? "test" : k === "E2E_TEST_MODE" ? "true" : undefined) } as unknown as ConfigService;
    const adapter = new FirebaseAuthAdapter(config);

    await expect(adapter.verifyIdToken("e2e::uid-123")).resolves.toEqual({ uid: "uid-123" });
    await expect(adapter.verifyIdToken("e2e::")).rejects.toThrow(UnauthorizedException);
    await expect(adapter.verifyIdToken("not-e2e-token")).rejects.toThrow(UnauthorizedException);
    const created = await adapter.createUser("a@b.com", "password");
    expect(created.uid).toMatch(/^e2e_/);
  });

  it("normal mode: initialize app and verify/create user via admin SDK", async () => {
    const mockAuth = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "user-1", email: "user@x" }),
      createUser: jest.fn().mockResolvedValue({ uid: "u-1" }),
    };

    admin.initializeApp.mockReturnValue({ auth: () => mockAuth });
    admin.credential.cert.mockReturnValue({});

    const config = { get: (k: string) => undefined } as unknown as ConfigService;
    const adapter = new FirebaseAuthAdapter(config);
    adapter.onModuleInit();

    const decoded = await adapter.verifyIdToken("some-token");
    expect(decoded).toEqual({ uid: "user-1", email: "user@x" });

    const created = await adapter.createUser("a@b.com", "strongpass");
    expect(created).toEqual({ uid: "u-1" });
    expect(mockAuth.createUser).toHaveBeenCalledWith({ email: "a@b.com", password: "strongpass" });
  });

  it("createUser: maps Firebase errors to BadRequestException", async () => {
    const mockAuth = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: "user-1" }),
      createUser: jest.fn(),
    };
    admin.initializeApp.mockReturnValue({ auth: () => mockAuth });
    admin.credential.applicationDefault.mockReturnValue({});

    const config = { get: (k: string) => undefined } as unknown as ConfigService;
    const adapter = new FirebaseAuthAdapter(config);
    adapter.onModuleInit();

    mockAuth.createUser.mockRejectedValueOnce({ code: "auth/email-already-exists", message: "exists" });
    await expect(adapter.createUser("dupe@b.com", "pwd")).rejects.toThrow(BadRequestException);

    mockAuth.createUser.mockRejectedValueOnce({ code: "auth/invalid-password", message: "short" });
    await expect(adapter.createUser("a@b.com", "123")).rejects.toThrow(BadRequestException);

    mockAuth.createUser.mockRejectedValueOnce({ message: "other error" });
    await expect(adapter.createUser("a@b.com", "pwd123")).rejects.toThrow(BadRequestException);
  });
});
