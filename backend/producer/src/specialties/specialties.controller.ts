import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { Roles } from "../auth/decorators/roles.decorator";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { RoleGuard } from "../auth/guards/role.guard";
import {
  SPECIALTY_SERVICE_TOKEN,
  SpecialtyServicePort,
} from "../domain/ports/inbound/specialty-service.port";
import { CreateSpecialtyDto } from "../dto/create-specialty.dto";
import { SpecialtyResponseDto } from "../dto/specialty-response.dto";
import { UpdateSpecialtyDto } from "../dto/update-specialty.dto";

/**
 * SPEC-015: CRUD de especialidades médicas.
 * GET  /specialties         — cualquier rol autenticado (para poblar selectores)
 * POST /specialties         — admin only
 * PATCH /specialties/:id   — admin only
 * DELETE /specialties/:id  — admin only
 */
@ApiTags("Specialties")
@ApiBearerAuth()
@Controller("specialties")
export class SpecialtiesController {
  constructor(
    @Inject(SPECIALTY_SERVICE_TOKEN)
    private readonly specialtyService: SpecialtyServicePort,
  ) {}

  @Get()
  @UseGuards(FirebaseAuthGuard)
  @ApiOperation({ summary: "Listar todas las especialidades del catálogo" })
  @ApiResponse({ status: 200, type: [SpecialtyResponseDto] })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  async findAll(): Promise<SpecialtyResponseDto[]> {
    const items = await this.specialtyService.findAll();
    return items.map((s) => this.toDto(s));
  }

  @Post()
  @HttpCode(201)
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Crear una nueva especialidad (admin)" })
  @ApiResponse({ status: 201, type: SpecialtyResponseDto })
  @ApiResponse({ status: 400, description: "Nombre inválido o faltante" })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  @ApiResponse({ status: 409, description: "La especialidad ya existe" })
  async create(@Body() dto: CreateSpecialtyDto): Promise<SpecialtyResponseDto> {
    const specialty = await this.specialtyService.createSpecialty({
      name: dto.name,
    });
    return this.toDto(specialty);
  }

  @Patch(":id")
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Actualizar nombre de especialidad (admin)" })
  @ApiParam({ name: "id", description: "Specialty MongoDB ObjectId" })
  @ApiResponse({ status: 200, type: SpecialtyResponseDto })
  @ApiResponse({ status: 400, description: "Nombre inválido" })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  @ApiResponse({ status: 404, description: "Especialidad no encontrada" })
  @ApiResponse({ status: 409, description: "Nombre duplicado" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateSpecialtyDto,
  ): Promise<SpecialtyResponseDto> {
    const specialty = await this.specialtyService.updateSpecialty(id, dto.name);
    return this.toDto(specialty);
  }

  @Delete(":id")
  @HttpCode(204)
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @ApiOperation({ summary: "Eliminar especialidad del catálogo (admin)" })
  @ApiParam({ name: "id", description: "Specialty MongoDB ObjectId" })
  @ApiResponse({ status: 204, description: "Eliminada" })
  @ApiResponse({
    status: 400,
    description: "No se puede eliminar: hay doctores vinculados",
  })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  @ApiResponse({ status: 404, description: "Especialidad no encontrada" })
  async remove(@Param("id") id: string): Promise<void> {
    await this.specialtyService.deleteSpecialty(id);
  }

  private toDto(specialty: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
  }): SpecialtyResponseDto {
    return {
      id: specialty.id,
      name: specialty.name,
      createdAt: specialty.createdAt,
      updatedAt: specialty.updatedAt,
    };
  }
}
