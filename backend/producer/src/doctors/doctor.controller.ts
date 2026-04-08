import {
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
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { Roles } from "../auth/decorators/roles.decorator";
import { DoctorContextGuard } from "../auth/guards/doctor-context.guard";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { RoleGuard } from "../auth/guards/role.guard";
import { DoctorStatus } from "../domain/models/doctor-view";
import { DoctorServicePort } from "../domain/ports/inbound/doctor-service.port";
import { CheckInDto } from "../dto/check-in.dto";
import { CreateDoctorDto } from "../dto/create-doctor.dto";
import { DoctorResponseDto } from "../dto/doctor-response.dto";
import { DoctorMapper } from "../mappers/doctor.mapper";

@ApiTags("Doctors")
@ApiBearerAuth()
@Controller("doctors")
export class DoctorController {
  constructor(
    @Inject("DoctorService")
    private readonly doctorService: DoctorServicePort,
  ) {}

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Registrar un nuevo médico" })
  @ApiResponse({
    status: 201,
    description: "Médico creado",
    type: DoctorResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Campos obligatorios faltantes o inválidos",
  })
  async createDoctor(@Body() dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    const doctor = await this.doctorService.createDoctor({
      name: dto.name,
      specialty: dto.specialty,
      office: null,
    });
    return DoctorMapper.toDto(doctor);
  }

  @Get()
  @ApiOperation({
    summary: "Listar todos los médicos",
    description: "Filtra opcionalmente por estado de disponibilidad.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["available", "busy", "offline"],
    description: "Filtrar por estado",
  })
  @ApiResponse({ status: 200, type: [DoctorResponseDto] })
  async getDoctors(
    @Query("status") status?: DoctorStatus,
  ): Promise<DoctorResponseDto[]> {
    const doctors = await this.doctorService.findAll(status);
    return DoctorMapper.toDtoList(doctors);
  }

  /**
   * SPEC-016: Returns enabled and unoccupied office numbers sorted ascending.
   * Must be declared BEFORE ":id" routes so the literal segment doesn't
   * match the ":id" parameter.
   * Route aligned with frontend contract: GET /doctors/available-offices
   */
  @Get("available-offices")
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin", "doctor")
  @ApiOperation({
    summary: "Consultorios habilitados y libres para check-in",
    description:
      "Devuelve los números de consultorios habilitados y no ocupados, ordenados ascendentemente.",
  })
  @ApiResponse({
    status: 200,
    schema: { type: "array", items: { type: "string" }, example: ["1", "3", "5"] },
  })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  async getAvailableOffices(): Promise<string[]> {
    return this.doctorService.getAvailableOffices();
  }

  @Get(":id")
  @UseGuards(FirebaseAuthGuard, RoleGuard, DoctorContextGuard)
  @Roles("admin", "doctor")
  @ApiOperation({ summary: "Obtener médico por ID" })
  @ApiParam({ name: "id", description: "Doctor MongoDB ObjectId" })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  @ApiResponse({ status: 404, description: "Médico no encontrado" })
  async getDoctorById(@Param("id") id: string): Promise<DoctorResponseDto> {
    const doctor = await this.doctorService.findById(id);
    return DoctorMapper.toDto(doctor);
  }

  @Patch(":id/check-in")
  @UseGuards(FirebaseAuthGuard, RoleGuard, DoctorContextGuard)
  @Roles("admin", "doctor")
  @ApiOperation({
    summary: "Check-in del médico",
    description:
      "El médico elige consultorio y se reporta disponible. " +
      "Valida contra catálogo Office habilitado. Dispara evento doctor_checked_in.",
  })
  @ApiParam({ name: "id", description: "Doctor MongoDB ObjectId" })
  @ApiResponse({
    status: 200,
    description: "Médico registrado como disponible",
    schema: {
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        status: { type: "string" },
        office: { type: "string" },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 400, description: "Consultorio inválido o no existe" })
  @ApiResponse({ status: 404, description: "Médico no encontrado" })
  @ApiResponse({
    status: 409,
    description: "Médico ya disponible, o consultorio ocupado/deshabilitado",
  })
  async checkIn(
    @Param("id") id: string,
    @Body() dto: CheckInDto,
  ): Promise<{
    id: string;
    name: string;
    status: string;
    office: string | null;
    message: string;
  }> {
    const doctor = await this.doctorService.checkIn(id, dto.office);
    return {
      id: doctor.id,
      name: doctor.name,
      status: doctor.status,
      office: doctor.office,
      message: "Médico registrado como disponible",
    };
  }

  @Patch(":id/check-out")
  @UseGuards(FirebaseAuthGuard, RoleGuard, DoctorContextGuard)
  @Roles("admin", "doctor")
  @ApiOperation({
    summary: "Check-out del médico",
    description:
      "El médico se reporta no disponible, el consultorio queda libre.",
  })
  @ApiParam({ name: "id", description: "Doctor MongoDB ObjectId" })
  @ApiResponse({
    status: 200,
    description: "Médico registrado como no disponible",
    schema: {
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        status: { type: "string" },
        office: { type: "string", nullable: true },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Médico no encontrado" })
  @ApiResponse({
    status: 409,
    description: "Médico tiene paciente asignado, no puede hacer check-out",
  })
  async checkOut(@Param("id") id: string): Promise<{
    id: string;
    name: string;
    status: string;
    office: string | null;
    message: string;
  }> {
    const doctor = await this.doctorService.checkOut(id);
    return {
      id: doctor.id,
      name: doctor.name,
      status: doctor.status,
      office: doctor.office,
      message: "Médico registrado como no disponible",
    };
  }
}
