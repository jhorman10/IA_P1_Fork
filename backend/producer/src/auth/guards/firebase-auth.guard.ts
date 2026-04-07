import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";

import {
  FIREBASE_AUTH_PORT,
  FirebaseAuthPort,
} from "../../domain/ports/outbound/firebase-auth.port";
import {
  PROFILE_REPOSITORY_TOKEN,
  ProfileRepository,
} from "../../domain/ports/outbound/profile.repository";
import { AuthenticatedUser } from "../types/authenticated-user";

/**
 * SPEC-004: Guard — validates Firebase Bearer token and resolves the active Profile.
 * Sets request.user = { uid, role, status, doctor_id } for downstream guards/controllers.
 *
 * HTTP 401 → missing/invalid/expired token.
 * HTTP 404 → token valid but Profile not found (never configured by admin).
 * HTTP 403 → Profile found but inactive.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    @Inject(FIREBASE_AUTH_PORT)
    private readonly firebaseAuth: FirebaseAuthPort,
    @Inject(PROFILE_REPOSITORY_TOKEN)
    private readonly profileRepo: ProfileRepository,
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

    const profile = await this.profileRepo.findByUid(decoded.uid);
    if (!profile) {
      throw new NotFoundException("Perfil operativo no configurado");
    }
    if (profile.status !== "active") {
      throw new ForbiddenException("Perfil inactivo");
    }

    request.user = {
      uid: profile.uid,
      role: profile.role,
      status: profile.status,
      doctor_id: profile.doctor_id,
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
