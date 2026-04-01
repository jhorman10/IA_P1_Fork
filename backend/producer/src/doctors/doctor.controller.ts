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
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { DoctorStatus } from "../domain/models/doctor-view";
import { DoctorServicePort } from "../domain/ports/inbound/doctor-service.port";
import { CreateDoctorDto } from "../dto/create-doctor.dto";
import { DoctorResponseDto } from "../dto/doctor-response.dto";
import { DoctorMapper } from "../mappers/doctor.mapper";

@ApiTags("Doctors")
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
  @ApiResponse({
    status: 409,
    description: "Ya existe un médico asignado a ese consultorio",
  })
  async createDoctor(@Body() dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    const doctor = await this.doctorService.createDoctor({
      name: dto.name,
      specialty: dto.specialty,
      office: dto.office,
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

  @Get(":id")
  @ApiOperation({ summary: "Obtener médico por ID" })
  @ApiParam({ name: "id", description: "Doctor MongoDB ObjectId" })
  @ApiResponse({ status: 200, type: DoctorResponseDto })
  @ApiResponse({ status: 404, description: "Médico no encontrado" })
  async getDoctorById(@Param("id") id: string): Promise<DoctorResponseDto> {
    const doctor = await this.doctorService.findById(id);
    return DoctorMapper.toDto(doctor);
  }

  @Patch(":id/check-in")
  @ApiOperation({
    summary: "Check-in del médico",
    description:
      "El médico se reporta disponible. Dispara evento doctor_checked_in en RabbitMQ.",
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
  @ApiResponse({ status: 404, description: "Médico no encontrado" })
  @ApiResponse({ status: 409, description: "Médico ya está disponible" })
  async checkIn(
    @Param("id") id: string,
  ): Promise<{
    id: string;
    name: string;
    status: string;
    office: string;
    message: string;
  }> {
    const doctor = await this.doctorService.checkIn(id);
    return {
      id: doctor.id,
      name: doctor.name,
      status: doctor.status,
      office: doctor.office,
      message: "Médico registrado como disponible",
    };
  }

  @Patch(":id/check-out")
  @ApiOperation({
    summary: "Check-out del médico",
    description:
      "El médico se reporta no disponible (se retira del consultorio).",
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
        office: { type: "string" },
        message: { type: "string" },
      },
    },
  })
  @ApiResponse({ status: 404, description: "Médico no encontrado" })
  @ApiResponse({
    status: 409,
    description: "Médico tiene paciente asignado, no puede hacer check-out",
  })
  async checkOut(
    @Param("id") id: string,
  ): Promise<{
    id: string;
    name: string;
    status: string;
    office: string;
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
