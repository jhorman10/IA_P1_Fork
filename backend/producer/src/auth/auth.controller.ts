import {
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { Auditable } from "../common/decorators/auditable.decorator";
import { AuditInterceptor } from "../common/interceptors/audit.interceptor";
import {
  PROFILE_SERVICE_TOKEN,
  ProfileServicePort,
} from "../domain/ports/inbound/profile-service.port";
import { SessionResponseDto } from "../dto/session-response.dto";

/** Maps role → allowed frontend modules per SPEC-004 permissions matrix. */
const ROLE_MODULES: Record<string, string[]> = {
  admin: ["dashboard", "registration", "doctors", "profiles"],
  recepcionista: ["dashboard", "registration"],
  doctor: ["dashboard", "check-in"],
};

/**
 * SPEC-004: Auth controller.
 * POST /auth/session — validate Firebase idToken and resolve the active Profile.
 */
@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(PROFILE_SERVICE_TOKEN)
    private readonly profileService: ProfileServicePort,
  ) {}

  @Post("session")
  @HttpCode(200)
  @UseGuards(FirebaseAuthGuard)
  @UseInterceptors(AuditInterceptor)
  @Auditable("SESSION_RESOLVED")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Resolver sesión operativa",
    description:
      "Valida el idToken de Firebase y retorna el perfil operativo activo con los módulos permitidos.",
  })
  @ApiResponse({
    status: 200,
    description: "Sesión resuelta con perfil activo",
    type: SessionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Token ausente, expirado o inválido",
  })
  @ApiResponse({
    status: 403,
    description:
      "Perfil no encontrado o inactivo — el administrador debe crear/activar el perfil",
  })
  async resolveSession(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SessionResponseDto> {
    const profile = await this.profileService.resolveSession(user.uid);

    return {
      uid: profile.uid,
      email: profile.email,
      display_name: profile.display_name,
      role: profile.role,
      status: profile.status,
      doctor_id: profile.doctor_id,
      allowed_modules: ROLE_MODULES[profile.role] ?? [],
    };
  }
}
