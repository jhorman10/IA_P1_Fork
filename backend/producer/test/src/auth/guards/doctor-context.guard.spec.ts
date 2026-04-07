import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { DoctorContextGuard } from "src/auth/guards/doctor-context.guard";

describe("DoctorContextGuard", () => {
  let guard: DoctorContextGuard;

  const makeContext = (
    request: Record<string, unknown>,
    params: Record<string, string> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ...request, params }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    guard = new DoctorContextGuard();
  });

  it("should allow admin user regardless of route id", () => {
    // GIVEN
    const request = {
      user: {
        uid: "uid-admin",
        role: "admin",
        status: "active",
        doctor_id: null,
      },
    };

    // WHEN
    const result = guard.canActivate(makeContext(request, { id: "doctor-99" }));

    // THEN
    expect(result).toBe(true);
  });

  it("should allow doctor when operating own doctor context", () => {
    // GIVEN
    const request = {
      user: {
        uid: "uid-doctor",
        role: "doctor",
        status: "active",
        doctor_id: "doctor-1",
      },
    };

    // WHEN
    const result = guard.canActivate(makeContext(request, { id: "doctor-1" }));

    // THEN
    expect(result).toBe(true);
  });

  it("should reject doctor when operating another doctor context", () => {
    // GIVEN
    const request = {
      user: {
        uid: "uid-doctor",
        role: "doctor",
        status: "active",
        doctor_id: "doctor-1",
      },
    };

    // WHEN / THEN
    expect(() =>
      guard.canActivate(makeContext(request, { id: "doctor-2" })),
    ).toThrow(ForbiddenException);
  });

  it("should reject recepcionista role", () => {
    // GIVEN
    const request = {
      user: {
        uid: "uid-recep",
        role: "recepcionista",
        status: "active",
        doctor_id: null,
      },
    };

    // WHEN / THEN
    expect(() =>
      guard.canActivate(makeContext(request, { id: "doctor-1" })),
    ).toThrow(ForbiddenException);
  });

  it("should reject request when no user is present", () => {
    // WHEN / THEN
    expect(() =>
      guard.canActivate(makeContext({}, { id: "doctor-1" })),
    ).toThrow(ForbiddenException);
  });
});
