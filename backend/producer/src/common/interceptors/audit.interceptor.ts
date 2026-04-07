import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { from, Observable, of } from "rxjs";
import { switchMap, tap } from "rxjs/operators";

import { AuthenticatedUser } from "../../auth/types/authenticated-user";
import { ProfileView } from "../../domain/models/profile-view";
import {
  ProfileRepository,
  PROFILE_REPOSITORY_TOKEN,
} from "../../domain/ports/outbound/profile.repository";
import {
  OperationalAuditAction,
  OperationalAuditEntry,
  OperationalAuditPort,
  OPERATIONAL_AUDIT_PORT,
} from "../../domain/ports/outbound/operational-audit.port";
import { AUDIT_ACTION_KEY } from "../decorators/auditable.decorator";

const SESSION_DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

type AuditRequest = Request & { user?: AuthenticatedUser };

/**
 * SPEC-011: NestJS interceptor that records an OperationalAuditEntry after any
 * handler decorated with @Auditable(action) completes successfully.
 *
 * Behaviour:
 * - Only fires on successful handler exits (no exception thrown).
 * - Fire-and-forget: audit writes never block or delay the HTTP response.
 * - SESSION_RESOLVED is deduplicated to 1 entry per actorUid per 24 h window.
 * - PROFILE_UPDATED pre-fetches the previous profile state to build from/to diff.
 * - Audit failures are swallowed with a console.warn.
 * - Details are action-specific per SPEC-011 criteria 1.1–1.8.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(OPERATIONAL_AUDIT_PORT)
    private readonly auditPort: OperationalAuditPort,
    @Inject(PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepo: ProfileRepository,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<OperationalAuditAction>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    if (!action) return next.handle();

    const req = context.switchToHttp().getRequest<AuditRequest>();
    const actorUid = req.user?.uid;
    if (!actorUid) return next.handle();

    // PROFILE_UPDATED: pre-fetch previous state before the handler mutates it
    const prevProfile$: Observable<ProfileView | null> =
      action === "PROFILE_UPDATED" && req.params?.["uid"]
        ? from(
            this.profileRepo
              .findByUid(req.params["uid"] as string)
              .catch(() => null),
          )
        : of(null);

    return prevProfile$.pipe(
      switchMap((prevProfile) =>
        next.handle().pipe(
          tap((response) => {
            const targetUid: string | null =
              (req.params?.["uid"] as string | undefined) ??
              (req.body?.uid as string | undefined) ??
              null;
            const targetId: string | null =
              (req.params?.["id"] as string | undefined) ?? null;

            const details = buildDetails(action, req, response, prevProfile);

            const entry: OperationalAuditEntry = {
              action,
              actorUid,
              targetUid,
              targetId,
              details,
              timestamp: Date.now(),
            };

            if (action === "SESSION_RESOLVED") {
              this.auditPort
                .hasRecentEntry(actorUid, action, SESSION_DEDUP_WINDOW_MS)
                .then((hasRecent) => {
                  if (!hasRecent) return this.auditPort.log(entry);
                })
                .catch((err: unknown) =>
                  console.warn("[AuditInterceptor] dedup check failed", err),
                );
            } else {
              this.auditPort
                .log(entry)
                .catch((err: unknown) =>
                  console.warn("[AuditInterceptor] log failed", err),
                );
            }
          }),
        ),
      ),
    );
  }
}

/**
 * SPEC-011: Builds action-specific audit details per spec criteria 1.1–1.8.
 * Extracted as a top-level function to keep the interceptor class slim and
 * to allow unit testing of the mapping logic in isolation.
 */
function buildDetails(
  action: OperationalAuditAction,
  req: AuditRequest,
  response: unknown,
  prevProfile: ProfileView | null,
): Record<string, unknown> {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const res =
    response !== null && typeof response === "object"
      ? (response as Record<string, unknown>)
      : {};

  switch (action) {
    case "PROFILE_CREATED":
      // CRITERIO-1.1: { role, email, displayName }
      return {
        role: body["role"],
        email: body["email"],
        displayName: body["display_name"],
      };

    case "PROFILE_UPDATED": {
      // CRITERIO-1.2: { changes: { field: { from, to } } }
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const field of ["role", "status", "doctor_id"] as const) {
        if (body[field] !== undefined) {
          changes[field] = {
            from: prevProfile
              ? (prevProfile[field as keyof ProfileView] as unknown)
              : undefined,
            to: body[field],
          };
        }
      }
      return { changes };
    }

    case "DOCTOR_CHECK_IN":
      // CRITERIO-1.3: { doctorName, office, previousStatus: "offline" }
      return {
        doctorName: res["name"],
        office: res["office"],
        previousStatus: "offline",
      };

    case "DOCTOR_CHECK_OUT":
      // CRITERIO-1.4: { doctorName, office, previousStatus: "available" }
      return {
        doctorName: res["name"],
        office: res["office"],
        previousStatus: "available",
      };

    case "APPOINTMENT_CREATED":
      // CRITERIO-1.5: { patientIdCard, patientName, priority }
      return {
        patientIdCard: body["idCard"],
        patientName: body["fullName"],
        priority: body["priority"],
      };

    case "SESSION_RESOLVED":
      // CRITERIO-1.8: { role, email } from the resolved profile response
      return { role: res["role"], email: res["email"] };

    default:
      return {};
  }
}
