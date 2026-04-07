import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

import { AuthenticatedUser } from "../types/authenticated-user";

/**
 * SPEC-004: Parameter decorator that extracts the authenticated user from the request.
 * Usage: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    return request.user;
  },
);
