import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { RoleGuard } from "src/auth/guards/role.guard";

describe("RoleGuard", () => {
  let guard: RoleGuard;
  let reflector: jest.Mocked<Reflector>;

  const makeContext = (request: Record<string, unknown>): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RoleGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should allow access when endpoint has no role metadata", () => {
    // GIVEN
    reflector.getAllAndOverride.mockReturnValue(undefined);

    // WHEN
    const result = guard.canActivate(makeContext({ user: undefined }));

    // THEN
    expect(result).toBe(true);
  });

  it("should allow access when user role is included in required roles", () => {
    // GIVEN
    reflector.getAllAndOverride.mockReturnValue(["admin"]);
    const request = {
      user: {
        uid: "uid-admin",
        role: "admin",
        status: "active",
        doctor_id: null,
      },
    };

    // WHEN
    const result = guard.canActivate(makeContext(request));

    // THEN
    expect(result).toBe(true);
  });

  it("should throw ForbiddenException when user is missing", () => {
    // GIVEN
    reflector.getAllAndOverride.mockReturnValue(["admin"]);

    // WHEN / THEN
    expect(() => guard.canActivate(makeContext({}))).toThrow(
      ForbiddenException,
    );
  });

  it("should throw ForbiddenException when user role is not allowed", () => {
    // GIVEN
    reflector.getAllAndOverride.mockReturnValue(["admin", "recepcionista"]);
    const request = {
      user: {
        uid: "uid-doctor",
        role: "doctor",
        status: "active",
        doctor_id: "doctor-1",
      },
    };

    // WHEN / THEN
    expect(() => guard.canActivate(makeContext(request))).toThrow(
      ForbiddenException,
    );
  });
});
