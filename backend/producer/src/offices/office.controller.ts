import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
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
import { Auditable } from "../common/decorators/auditable.decorator";
import { AuditInterceptor } from "../common/interceptors/audit.interceptor";
import { OfficeServicePort } from "../domain/ports/inbound/office-service.port";
import { OfficeResponseDto } from "../dto/office-response.dto";
import { PatchOfficeCapacityDto } from "../dto/patch-office-capacity.dto";
import { UpdateOfficeEnabledDto } from "../dto/update-office-enabled.dto";

@ApiTags("Offices")
@ApiBearerAuth()
@Controller("offices")
export class OfficeController {
  constructor(
    @Inject("OfficeService")
    private readonly officeService: OfficeServicePort,
  ) {}

  @Get()
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Listar catálogo completo de consultorios",
    description:
      "Devuelve todos los consultorios con estado habilitado/deshabilitado y ocupación derivada.",
  })
  @ApiResponse({ status: 200, type: [OfficeResponseDto] })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  async getAll(): Promise<OfficeResponseDto[]> {
    const offices = await this.officeService.getAll();
    return offices.map((o) => ({
      number: o.number,
      enabled: o.enabled,
      occupied: o.occupied,
      occupiedByDoctorId: o.occupiedByDoctorId,
      occupiedByDoctorName: o.occupiedByDoctorName,
      occupiedByStatus: o.occupiedByStatus,
      canDisable: o.canDisable,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    }));
  }

  @Patch("capacity")
  @HttpCode(200)
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @UseInterceptors(AuditInterceptor)
  @Auditable("OFFICE_CAPACITY_UPDATED")
  @ApiOperation({
    summary: "Ajustar capacidad objetivo de consultorios",
    description:
      "Crea consultorios secuenciales hasta alcanzar el objetivo. Idempotente si ya se alcanzó. " +
      "Rechaza reducción por debajo del máximo existente.",
  })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        target_total: { type: "number", example: 8 },
        created_offices: {
          type: "array",
          items: { type: "string" },
          example: ["6", "7", "8"],
        },
        unchanged: { type: "boolean", example: false },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "target_total inválido o intento de reducción",
  })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  async adjustCapacity(
    @Body() dto: PatchOfficeCapacityDto,
  ): Promise<{
    target_total: number;
    created_offices: string[];
    unchanged: boolean;
  }> {
    const result = await this.officeService.adjustCapacity({
      targetTotal: dto.target_total,
    });
    return {
      target_total: result.targetTotal,
      created_offices: result.createdOffices,
      unchanged: result.unchanged,
    };
  }

  @Patch(":number")
  @HttpCode(200)
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @UseInterceptors(AuditInterceptor)
  @Auditable("OFFICE_ENABLED")
  @ApiOperation({
    summary: "Habilitar o deshabilitar un consultorio",
    description:
      "Actualiza el estado enabled de un consultorio. Bloquea si el consultorio está ocupado.",
  })
  @ApiParam({
    name: "number",
    description: "Número del consultorio",
    example: "4",
  })
  @ApiResponse({ status: 200, type: OfficeResponseDto })
  @ApiResponse({ status: 404, description: "Consultorio no encontrado" })
  @ApiResponse({
    status: 409,
    description: "Consultorio ocupado, no puede deshabilitarse",
  })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({ status: 403, description: "Rol no autorizado" })
  async updateEnabled(
    @Param("number") number: string,
    @Body() dto: UpdateOfficeEnabledDto,
  ): Promise<OfficeResponseDto> {
    const office = await this.officeService.updateEnabled(number, dto.enabled);
    return {
      number: office.number,
      enabled: office.enabled,
      occupied: office.occupied,
      occupiedByDoctorId: office.occupiedByDoctorId,
      occupiedByDoctorName: office.occupiedByDoctorName,
      occupiedByStatus: office.occupiedByStatus,
      canDisable: office.canDisable,
      createdAt: office.createdAt,
      updatedAt: office.updatedAt,
    };
  }
}
