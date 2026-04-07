import { Controller, Get, Inject, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { Roles } from "../auth/decorators/roles.decorator";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { RoleGuard } from "../auth/guards/role.guard";
import {
  OPERATIONAL_METRICS_PORT,
  OperationalMetricsPort,
} from "../domain/ports/inbound/operational-metrics.port";
import { OperationalMetricsResponseDto } from "../dto/operational-metrics-response.dto";

/**
 * SPEC-013: Metrics Controller.
 * GET /metrics — admin-only endpoint returning operational KPIs.
 */
@ApiTags("Metrics")
@ApiBearerAuth()
@Controller("metrics")
export class MetricsController {
  constructor(
    @Inject(OPERATIONAL_METRICS_PORT)
    private readonly metricsUseCase: OperationalMetricsPort,
  ) {}

  @Get()
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Consultar métricas operativas del sistema (admin)",
  })
  @ApiResponse({
    status: 200,
    type: OperationalMetricsResponseDto,
    description: "Métricas operativas agregadas",
  })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({
    status: 403,
    description: "Rol no autorizado — requiere admin",
  })
  async getMetrics(): Promise<OperationalMetricsResponseDto> {
    return this.metricsUseCase.getMetrics();
  }
}
