import { CallHandler, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { firstValueFrom, of, throwError } from "rxjs";

import { AUDIT_ACTION_KEY } from "src/common/decorators/auditable.decorator";
import { AuditInterceptor } from "src/common/interceptors/audit.interceptor";
import { OperationalAuditPort } from "src/domain/ports/outbound/operational-audit.port";
import { ProfileRepository } from "src/domain/ports/outbound/profile.repository";

type HttpRequestWithUser = {
  user?: { uid?: string };
  params?: Record<string, string>;
  body?: Record<string, unknown>;
};

describe("AuditInterceptor", () => {
  let reflector: jest.Mocked<Reflector>;
  let auditPort: jest.Mocked<OperationalAuditPort>;
  let profileRepo: jest.Mocked<Pick<ProfileRepository, "findByUid">>;
  let interceptor: AuditInterceptor;
  const handler = jest.fn();

  const createContext = (request: HttpRequestWithUser): ExecutionContext =>
    ({
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  const createNext = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    auditPort = {
      log: jest.fn().mockResolvedValue(undefined),
      hasRecentEntry: jest.fn().mockResolvedValue(false),
    };

    profileRepo = {
      findByUid: jest.fn().mockResolvedValue(null),
    };

    interceptor = new AuditInterceptor(
      reflector,
      auditPort,
      profileRepo as unknown as ProfileRepository,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  // ─── SPEC-011 CRITERIO-1.1: PROFILE_CREATED ───────────────────────────────

  it("PROFILE_CREATED — logs { role, email, displayName } from request body", async () => {
    reflector.get.mockReturnValue("PROFILE_CREATED");
    const context = createContext({
      user: { uid: "uid-admin" },
      params: { uid: "uid-target" },
      body: {
        uid: "uid-target",
        email: "ana@clinic.example",
        display_name: "Ana Torres",
        role: "doctor",
      },
    });

    const response = await firstValueFrom(
      interceptor.intercept(context, createNext({ uid: "uid-target" })),
    );

    expect(response).toEqual({ uid: "uid-target" });
    expect(reflector.get).toHaveBeenCalledWith(AUDIT_ACTION_KEY, handler);
    expect(auditPort.hasRecentEntry).not.toHaveBeenCalled();
    expect(auditPort.log).toHaveBeenCalledTimes(1);
    expect(auditPort.log).toHaveBeenCalledWith({
      action: "PROFILE_CREATED",
      actorUid: "uid-admin",
      targetUid: "uid-target",
      targetId: null,
      details: {
        role: "doctor",
        email: "ana@clinic.example",
        displayName: "Ana Torres",
      },
      timestamp: expect.any(Number),
    });
  });

  // ─── SPEC-011 CRITERIO-1.2: PROFILE_UPDATED ───────────────────────────────

  it("PROFILE_UPDATED — logs { changes: { field: { from, to } } } with pre-fetched prev state", async () => {
    reflector.get.mockReturnValue("PROFILE_UPDATED");
    profileRepo.findByUid.mockResolvedValue({
      uid: "uid-target",
      email: "target@clinic.example",
      display_name: "Target User",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    });

    const context = createContext({
      user: { uid: "uid-admin" },
      params: { uid: "uid-target" },
      body: { role: "admin", status: "inactive" },
    });

    await firstValueFrom(
      interceptor.intercept(context, createNext({ uid: "uid-target" })),
    );
    await Promise.resolve();

    expect(profileRepo.findByUid).toHaveBeenCalledWith("uid-target");
    expect(auditPort.log).toHaveBeenCalledWith({
      action: "PROFILE_UPDATED",
      actorUid: "uid-admin",
      targetUid: "uid-target",
      targetId: null,
      details: {
        changes: {
          role: { from: "recepcionista", to: "admin" },
          status: { from: "active", to: "inactive" },
        },
      },
      timestamp: expect.any(Number),
    });
  });

  it("PROFILE_UPDATED — omits fields absent from request body", async () => {
    reflector.get.mockReturnValue("PROFILE_UPDATED");
    profileRepo.findByUid.mockResolvedValue({
      uid: "uid-target",
      email: "target@clinic.example",
      display_name: "Target User",
      role: "doctor",
      status: "active",
      doctor_id: "doc-1",
    });

    const context = createContext({
      user: { uid: "uid-admin" },
      params: { uid: "uid-target" },
      body: { status: "inactive" }, // only status sent
    });

    await firstValueFrom(
      interceptor.intercept(context, createNext({ uid: "uid-target" })),
    );
    await Promise.resolve();

    expect(auditPort.log).toHaveBeenCalledWith(
      expect.objectContaining({
        details: {
          changes: {
            status: { from: "active", to: "inactive" },
            // role and doctor_id are NOT in the diff since they were not sent
          },
        },
      }),
    );
  });

  // ─── SPEC-011 CRITERIO-1.3/1.4: DOCTOR_CHECK_IN / DOCTOR_CHECK_OUT ────────

  it("DOCTOR_CHECK_IN — logs { doctorName, office, previousStatus: offline } from response", async () => {
    reflector.get.mockReturnValue("DOCTOR_CHECK_IN");
    const context = createContext({
      user: { uid: "uid-doctor" },
      params: { id: "doc-mongo-id" },
    });

    await firstValueFrom(
      interceptor.intercept(
        context,
        createNext({
          id: "doc-mongo-id",
          name: "Dr. Laura Torres",
          status: "available",
          office: "3",
          message: "Médico registrado como disponible",
        }),
      ),
    );
    await Promise.resolve();

    expect(auditPort.log).toHaveBeenCalledWith({
      action: "DOCTOR_CHECK_IN",
      actorUid: "uid-doctor",
      targetUid: null,
      targetId: "doc-mongo-id",
      details: {
        doctorName: "Dr. Laura Torres",
        office: "3",
        previousStatus: "offline",
      },
      timestamp: expect.any(Number),
    });
  });

  it("DOCTOR_CHECK_OUT — logs { doctorName, office, previousStatus: available } from response", async () => {
    reflector.get.mockReturnValue("DOCTOR_CHECK_OUT");
    const context = createContext({
      user: { uid: "uid-doctor" },
      params: { id: "doc-mongo-id" },
    });

    await firstValueFrom(
      interceptor.intercept(
        context,
        createNext({
          id: "doc-mongo-id",
          name: "Dr. Laura Torres",
          status: "offline",
          office: "3",
          message: "Médico registrado como no disponible",
        }),
      ),
    );
    await Promise.resolve();

    expect(auditPort.log).toHaveBeenCalledWith({
      action: "DOCTOR_CHECK_OUT",
      actorUid: "uid-doctor",
      targetUid: null,
      targetId: "doc-mongo-id",
      details: {
        doctorName: "Dr. Laura Torres",
        office: "3",
        previousStatus: "available",
      },
      timestamp: expect.any(Number),
    });
  });

  // ─── SPEC-011 CRITERIO-1.5: APPOINTMENT_CREATED ───────────────────────────

  it("APPOINTMENT_CREATED — logs { patientIdCard, patientName, priority } from request body", async () => {
    reflector.get.mockReturnValue("APPOINTMENT_CREATED");
    const context = createContext({
      user: { uid: "uid-recep" },
      body: { idCard: 12345678, fullName: "Pedro Ramirez", priority: "high" },
    });

    await firstValueFrom(
      interceptor.intercept(
        context,
        createNext({ status: "accepted", message: "Asignación en progreso" }),
      ),
    );
    await Promise.resolve();

    expect(auditPort.log).toHaveBeenCalledWith({
      action: "APPOINTMENT_CREATED",
      actorUid: "uid-recep",
      targetUid: null,
      targetId: null,
      details: {
        patientIdCard: 12345678,
        patientName: "Pedro Ramirez",
        priority: "high",
      },
      timestamp: expect.any(Number),
    });
  });

  // ─── SPEC-011 CRITERIO-1.8: SESSION_RESOLVED ──────────────────────────────

  it("SESSION_RESOLVED — deduplicates when a recent entry exists", async () => {
    reflector.get.mockReturnValue("SESSION_RESOLVED");
    auditPort.hasRecentEntry.mockResolvedValue(true);

    const context = createContext({ user: { uid: "uid-admin" } });

    await firstValueFrom(
      interceptor.intercept(
        context,
        createNext({
          uid: "uid-admin",
          email: "admin@clinic.example",
          role: "admin",
        }),
      ),
    );
    await Promise.resolve();

    expect(auditPort.hasRecentEntry).toHaveBeenCalledTimes(1);
    expect(auditPort.hasRecentEntry).toHaveBeenCalledWith(
      "uid-admin",
      "SESSION_RESOLVED",
      24 * 60 * 60 * 1000,
    );
    expect(auditPort.log).not.toHaveBeenCalled();
  });

  it("SESSION_RESOLVED — logs { role, email } from response when no recent entry", async () => {
    reflector.get.mockReturnValue("SESSION_RESOLVED");
    auditPort.hasRecentEntry.mockResolvedValue(false);

    const context = createContext({ user: { uid: "uid-admin" } });
    const sessionResponse = {
      uid: "uid-admin",
      email: "admin@clinic.example",
      role: "admin",
      status: "active",
    };

    await firstValueFrom(
      interceptor.intercept(context, createNext(sessionResponse)),
    );
    await Promise.resolve();

    expect(auditPort.hasRecentEntry).toHaveBeenCalledWith(
      "uid-admin",
      "SESSION_RESOLVED",
      24 * 60 * 60 * 1000,
    );
    expect(auditPort.log).toHaveBeenCalledWith({
      action: "SESSION_RESOLVED",
      actorUid: "uid-admin",
      targetUid: null,
      targetId: null,
      details: { role: "admin", email: "admin@clinic.example" },
      timestamp: expect.any(Number),
    });
  });

  // ─── Generic behaviour guards ─────────────────────────────────────────────

  it("skips audit when handler has no auditable metadata", async () => {
    reflector.get.mockReturnValue(undefined);

    const context = createContext({
      user: { uid: "uid-admin" },
      body: { role: "doctor" },
    });

    await firstValueFrom(interceptor.intercept(context, createNext("ok")));

    expect(auditPort.log).not.toHaveBeenCalled();
    expect(auditPort.hasRecentEntry).not.toHaveBeenCalled();
  });

  it("skips audit when request has no authenticated actor", async () => {
    reflector.get.mockReturnValue("PROFILE_CREATED");

    const context = createContext({
      params: { uid: "uid-target" },
      body: { role: "doctor" },
    });

    await firstValueFrom(interceptor.intercept(context, createNext("ok")));

    expect(auditPort.log).not.toHaveBeenCalled();
    expect(auditPort.hasRecentEntry).not.toHaveBeenCalled();
    expect(profileRepo.findByUid).not.toHaveBeenCalled();
  });

  it("does not log when handler throws an exception", async () => {
    reflector.get.mockReturnValue("PROFILE_CREATED");

    const context = createContext({
      user: { uid: "uid-admin" },
      body: { role: "doctor", email: "d@c.com", display_name: "D" },
    });
    const next: CallHandler = {
      handle: () => throwError(() => new Error("boom")),
    };

    await expect(
      firstValueFrom(interceptor.intercept(context, next)),
    ).rejects.toThrow("boom");

    expect(auditPort.log).not.toHaveBeenCalled();
  });

  it("keeps response flow non-blocking when audit log promise is pending", async () => {
    reflector.get.mockReturnValue("PROFILE_CREATED");

    let resolveLog: (() => void) | undefined;
    const pendingLog = new Promise<void>((resolve) => {
      resolveLog = resolve;
    });
    auditPort.log.mockReturnValue(pendingLog);

    const context = createContext({
      user: { uid: "uid-admin" },
      body: { role: "doctor", email: "d@c.com", display_name: "D" },
    });

    const result = await firstValueFrom(
      interceptor.intercept(context, createNext("ok")),
    );

    expect(result).toBe("ok");
    expect(auditPort.log).toHaveBeenCalledTimes(1);

    resolveLog?.();
    await pendingLog;
  });

  it("warns and swallows failures from log", async () => {
    reflector.get.mockReturnValue("PROFILE_CREATED");

    const error = new Error("db-timeout");
    auditPort.log.mockRejectedValue(error);

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });

    const context = createContext({
      user: { uid: "uid-admin" },
      body: { role: "doctor", email: "d@c.com", display_name: "D" },
    });

    await firstValueFrom(interceptor.intercept(context, createNext("ok")));
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      "[AuditInterceptor] log failed",
      error,
    );
  });

  it("warns when session dedup check fails", async () => {
    reflector.get.mockReturnValue("SESSION_RESOLVED");

    const error = new Error("mongo-unreachable");
    auditPort.hasRecentEntry.mockRejectedValue(error);

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {
      return undefined;
    });

    const context = createContext({ user: { uid: "uid-admin" } });

    await firstValueFrom(
      interceptor.intercept(
        context,
        createNext({
          uid: "uid-admin",
          email: "admin@clinic.example",
          role: "admin",
        }),
      ),
    );
    await Promise.resolve();

    expect(warnSpy).toHaveBeenCalledWith(
      "[AuditInterceptor] dedup check failed",
      error,
    );
    expect(auditPort.log).not.toHaveBeenCalled();
  });
});
