import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import { ProfileRole } from "../../schemas/profile.schema";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../types/authenticated-user";

/**
 * SPEC-004: Guard — validates that the authenticated user has one of the required roles.
 * Must be applied AFTER FirebaseAuthGuard (requires request.user to be set).
 *
 * HTTP 403 → authenticated but role not in the allowed list.
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<ProfileRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() decorator → endpoint is authenticated but not role-restricted.
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException("Usuario no autenticado");
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado. Roles permitidos: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
