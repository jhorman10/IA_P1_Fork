import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { ProfileView } from "src/domain/models/profile-view";
import { FirebaseAuthPort } from "src/domain/ports/outbound/firebase-auth.port";
import { ProfileRepository } from "src/domain/ports/outbound/profile.repository";

describe("FirebaseAuthGuard", () => {
  let guard: FirebaseAuthGuard;
  let firebaseAuth: jest.Mocked<FirebaseAuthPort>;
  let profileRepo: jest.Mocked<ProfileRepository>;

  const activeProfile: ProfileView = {
    uid: "uid-admin",
    email: "admin@clinic.example",
    display_name: "Admin",
    role: "admin",
    status: "active",
    doctor_id: null,
  };

  const makeContext = (request: Record<string, unknown>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
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

    guard = new FirebaseAuthGuard(firebaseAuth, profileRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should authenticate valid bearer token and attach authenticated user", async () => {
    // GIVEN
    const request: Record<string, unknown> = {
      headers: { authorization: "Bearer valid-token" },
    };
    firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-admin" });
    profileRepo.findByUid.mockResolvedValue(activeProfile);

    // WHEN
    const result = await guard.canActivate(makeContext(request));

    // THEN
    expect(result).toBe(true);
    expect(firebaseAuth.verifyIdToken).toHaveBeenCalledWith("valid-token");
    expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-admin");
    expect(request["user"]).toEqual({
      uid: "uid-admin",
      role: "admin",
      status: "active",
      doctor_id: null,
    });
  });

  it("should throw UnauthorizedException when authorization header is missing", async () => {
    // GIVEN
    const request: Record<string, unknown> = {
      headers: {},
    };

    // WHEN / THEN
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(firebaseAuth.verifyIdToken).not.toHaveBeenCalled();
    expect(profileRepo.findByUid).not.toHaveBeenCalled();
  });

  it("should throw UnauthorizedException when scheme is not Bearer", async () => {
    // GIVEN
    const request: Record<string, unknown> = {
      headers: { authorization: "Basic abc123" },
    };

    // WHEN / THEN
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(firebaseAuth.verifyIdToken).not.toHaveBeenCalled();
  });

  it("should throw ForbiddenException when profile does not exist", async () => {
    // GIVEN
    const request: Record<string, unknown> = {
      headers: { authorization: "Bearer valid-token" },
    };
    firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-missing" });
    profileRepo.findByUid.mockResolvedValue(null);

    // WHEN / THEN
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
      ForbiddenException,
    );
    expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-missing");
  });

  it("should throw ForbiddenException when profile is inactive", async () => {
    // GIVEN
    const request: Record<string, unknown> = {
      headers: { authorization: "Bearer valid-token" },
    };
    firebaseAuth.verifyIdToken.mockResolvedValue({ uid: "uid-inactive" });
    profileRepo.findByUid.mockResolvedValue({
      ...activeProfile,
      uid: "uid-inactive",
      role: "doctor",
      status: "inactive",
      doctor_id: "doctor-1",
    });

    // WHEN / THEN
    await expect(guard.canActivate(makeContext(request))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
