import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { DoctorContextGuard } from "../auth/guards/doctor-context.guard";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { FirebaseTokenOnlyGuard } from "../auth/guards/firebase-token-only.guard";
import { RoleGuard } from "../auth/guards/role.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { Auditable } from "../common/decorators/auditable.decorator";
import { AuditInterceptor } from "../common/interceptors/audit.interceptor";
import { DoctorServicePort } from "../domain/ports/inbound/doctor-service.port";
import {
  CreateProfileCommand,
  ListProfilesQuery,
  PROFILE_SERVICE_TOKEN,
  ProfileServicePort,
  UpdateProfileCommand,
} from "../domain/ports/inbound/profile-service.port";
import {
  SPECIALTY_SERVICE_TOKEN,
  SpecialtyServicePort,
} from "../domain/ports/inbound/specialty-service.port";
import {
  FIREBASE_AUTH_PORT,
  FirebaseAuthPort,
} from "../domain/ports/outbound/firebase-auth.port";
import { CreateProfileDto } from "../dto/create-profile.dto";
import { ProfileResponseDto } from "../dto/profile-response.dto";
import { SelfInitProfileDto } from "../dto/self-init-profile.dto";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { ProfileRole, ProfileStatus } from "../schemas/profile.schema";

/**
 * SPEC-004: Profiles controller.
 * SPEC-006: POST /profiles/self/initialize + @Throttle on sensitive endpoints.
 * SPEC-015: POST /profiles crea Doctor transparentemente cuando role === "doctor".
 *
 * GET  /profiles/me                 — authenticated user (any active role)
 * POST /profiles                    — admin only
 * GET  /profiles                    — admin only  [throttled: 20/min]
 * PATCH /profiles/:uid              — admin only  [throttled: 20/min]
 * POST /profiles/self/initialize    — any Firebase-authenticated user
 */
@ApiTags("Profiles")
@ApiBearerAuth()
@Controller("profiles")
export class ProfilesController {
  constructor(
    @Inject(PROFILE_SERVICE_TOKEN)
    private readonly profileService: ProfileServicePort,
    @Inject(FIREBASE_AUTH_PORT)
    private readonly firebaseAuth: FirebaseAuthPort,
    @Inject("DoctorService")
    private readonly doctorService: DoctorServicePort,
    @Inject(SPECIALTY_SERVICE_TOKEN)
    private readonly specialtyService: SpecialtyServicePort,
  ) {}

  @Get("me")
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: "Obtener el Perfil del Usuario autenticado" })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Perfil inactivo" })
  async getMyProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileService.resolveSession(user.uid);
    return this.toDto(profile);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @UseInterceptors(AuditInterceptor)
  @Auditable("PROFILE_CREATED")
  @ApiOperation({ summary: "Crear un nuevo Perfil operativo (admin)" })
  @ApiResponse({ status: 201, type: ProfileResponseDto })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos o doctor_id faltante",
  })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  @ApiResponse({ status: 409, description: "Perfil ya existe" })
  async createProfile(
    @Body() dto: CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    // Step 1: Create Firebase user with email + password → obtain UID
    const { uid } = await this.firebaseAuth.createUser(dto.email, dto.password);

    // Step 2 (SPEC-015): If role === "doctor", create Doctor entity transparently
    let doctorId: string | null = dto.doctor_id ?? null;
    if (dto.role === "doctor") {
      if (!dto.specialty_id) {
        throw new BadRequestException(
          "specialty_id es obligatorio al crear un perfil con rol doctor",
        );
      }
      const specialty = await this.specialtyService.findById(dto.specialty_id);
      const doctor = await this.doctorService.createDoctor({
        name: dto.display_name,
        specialty: specialty.name,
        specialtyId: dto.specialty_id,
        office: null,
      });
      doctorId = doctor.id;
    }

    // Step 3: Create the operational profile with the derived UID and doctor link
    const command: CreateProfileCommand = {
      uid,
      email: dto.email,
      displayName: dto.display_name,
      role: dto.role,
      doctorId,
    };
    const profile = await this.profileService.createProfile(command);
    return this.toDto(profile);
  }

  @Get()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Listar Perfiles operativos (admin)" })
  @ApiQuery({
    name: "role",
    required: false,
    enum: ["admin", "recepcionista", "doctor"],
  })
  @ApiQuery({ name: "status", required: false, enum: ["active", "inactive"] })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200, type: [ProfileResponseDto] })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  async listProfiles(
    @Query("role") role?: ProfileRole,
    @Query("status") status?: ProfileStatus,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ): Promise<{
    data: ProfileResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
    };
  }> {
    const query: ListProfilesQuery = {
      role,
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    };
    const result = await this.profileService.listProfiles(query);
    return {
      data: result.data.map((p) => this.toDto(p)),
      pagination: result.pagination,
    };
  }

  @Patch(":uid")
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @UseInterceptors(AuditInterceptor)
  @Auditable("PROFILE_UPDATED")
  @ApiOperation({ summary: "Actualizar Perfil operativo (admin)" })
  @ApiParam({ name: "uid", description: "Firebase UID del Usuario" })
  @ApiResponse({ status: 200, type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: "Combinación inválida de datos" })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  @ApiResponse({ status: 404, description: "Perfil no encontrado" })
  async updateProfile(
    @Param("uid") uid: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProfileResponseDto> {
    const command: UpdateProfileCommand = {
      role: dto.role,
      status: dto.status,
      doctorId: dto.doctor_id,
      changedBy: user?.uid,
      reason: dto.reason ?? null,
    };
    const profile = await this.profileService.updateProfile(uid, command);

    // SPEC-015 CRITERIO-1.2: update linked Doctor's specialty when specialty_id is provided
    // and the final role is doctor.
    if (dto.specialty_id !== undefined && profile.role === "doctor") {
      if (!profile.doctor_id) {
        throw new BadRequestException(
          "El perfil doctor no tiene un Doctor vinculado; no es posible actualizar la especialidad",
        );
      }
      const specialty = await this.specialtyService.findById(dto.specialty_id);
      await this.doctorService.updateSpecialty(
        profile.doctor_id,
        specialty.name,
        dto.specialty_id,
      );
    }

    return this.toDto(profile);
  }

  @Post("self/initialize")
  @HttpCode(201)
  @UseGuards(FirebaseTokenOnlyGuard)
  @ApiOperation({
    summary: "Auto-inicializar Perfil para usuario autenticado (SPEC-006)",
    description:
      "Crea el Perfil operativo para el usuario autenticado si no existe. " +
      "Solo permite rol recepcionista o doctor (admin no puede ser auto-asignado). " +
      "Devuelve 409 si el Perfil ya existe.",
  })
  @ApiResponse({ status: 201, type: ProfileResponseDto })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Token sin uid de Firebase" })
  @ApiResponse({
    status: 409,
    description: "Perfil ya existe para este usuario",
  })
  async initializeSelf(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SelfInitProfileDto,
  ): Promise<ProfileResponseDto> {
    const profile = await this.profileService.initializeSelf(
      user.uid,
      dto.email,
      dto.display_name,
      dto.role,
    );
    return this.toDto(profile);
  }

  private toDto(profile: {
    uid: string;
    email: string;
    display_name: string;
    role: ProfileRole;
    status: ProfileStatus;
    doctor_id: string | null;
    createdAt?: Date;
    updatedAt?: Date;
  }): ProfileResponseDto {
    return {
      uid: profile.uid,
      email: profile.email,
      display_name: profile.display_name,
      role: profile.role,
      status: profile.status,
      doctor_id: profile.doctor_id,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }
}
