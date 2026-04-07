import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";

import { AuthenticatedUser } from "../types/authenticated-user";

/**
 * SPEC-004: Guard — validates that a "doctor" role user can only operate on their own Doctor.
 * Applies to PATCH /doctors/:id/check-in and PATCH /doctors/:id/check-out.
 *
 * Rules (per spec matrix and HU-03 CRITERIO-3.4):
 *   - admin → always allowed (no id check needed)
 *   - doctor → allowed only if request.user.doctor_id === route param :id
 *   - recepcionista / undefined → should not reach here (RoleGuard blocks first)
 *
 * Must be applied AFTER FirebaseAuthGuard + RoleGuard.
 */
@Injectable()
export class DoctorContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Usuario no autenticado");
    }

    if (user.role === "admin") return true;

    if (user.role === "doctor") {
      const routeId = request.params["id"];
      if (!routeId || user.doctor_id !== routeId) {
        throw new ForbiddenException(
          "Un médico solo puede operar sobre su propio consultorio",
        );
      }
      return true;
    }

    throw new ForbiddenException("Acceso denegado");
  }
}
