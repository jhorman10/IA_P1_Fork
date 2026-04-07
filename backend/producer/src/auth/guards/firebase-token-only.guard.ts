import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";

import {
  FIREBASE_AUTH_PORT,
  FirebaseAuthPort,
} from "../../domain/ports/outbound/firebase-auth.port";
import { AuthenticatedUser } from "../types/authenticated-user";

/**
 * SPEC-006: Guard — validates Firebase Bearer token only. Does NOT require an existing Profile.
 * Designed for POST /profiles/self/initialize where the Profile may not exist yet.
 *
 * Sets request.user.uid from the decoded token. role/status are placeholder values
 * and must not be used by the handler that applies this guard.
 *
 * HTTP 401 → missing/invalid/expired token.
 * HTTP 403 → token valid but uid is absent (edge case — should not occur with valid Firebase tokens).
 */
@Injectable()
export class FirebaseTokenOnlyGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_AUTH_PORT)
    private readonly firebaseAuth: FirebaseAuthPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const token = this.extractBearer(request);
    if (!token) {
      throw new UnauthorizedException(
        "Authorization header con Bearer token requerido",
      );
    }

    const decoded = await this.firebaseAuth.verifyIdToken(token);
    if (!decoded.uid) {
      throw new ForbiddenException("Token no contiene uid de Firebase");
    }

    // Minimal stub — role/status are not meaningful here; the handler only uses uid.
    request.user = {
      uid: decoded.uid,
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    };

    return true;
  }

  private extractBearer(request: Request): string | null {
    const authHeader = request.headers["authorization"];
    if (!authHeader || typeof authHeader !== "string") return null;
    const [scheme, token] = authHeader.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return null;
    return token;
  }
}
