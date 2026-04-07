import { Controller, Get, Inject, Query, UseGuards } from "@nestjs/common";
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
  AuditLogFilters,
  OperationalAuditQueryPort,
  OPERATIONAL_AUDIT_QUERY_PORT,
} from "../domain/ports/outbound/operational-audit-query.port";
import { OperationalAuditEntry } from "../domain/ports/outbound/operational-audit.port";
import { AuditLogQueryDto } from "../dto/audit-log-query.dto";
import {
  AuditLogEntryDto,
  AuditLogPageDto,
} from "../dto/audit-log-response.dto";

/**
 * SPEC-011: Audit Controller.
 * GET /audit-logs — paginated, filterable, admin-only read of operational audit entries.
 */
@ApiTags("Audit")
@ApiBearerAuth()
@Controller("audit-logs")
export class AuditController {
  constructor(
    @Inject(OPERATIONAL_AUDIT_QUERY_PORT)
    private readonly auditQueryPort: OperationalAuditQueryPort,
  ) {}

  @Get()
  @UseGuards(FirebaseAuthGuard, RoleGuard)
  @Roles("admin")
  @ApiOperation({
    summary: "Consultar registros de auditoría operativa (admin)",
  })
  @ApiResponse({ status: 200, type: AuditLogPageDto })
  @ApiResponse({ status: 401, description: "Token ausente o inválido" })
  @ApiResponse({
    status: 403,
    description: "Rol no autorizado — requiere admin",
  })
  async getAuditLogs(
    @Query() query: AuditLogQueryDto,
  ): Promise<AuditLogPageDto> {
    const filters: AuditLogFilters = {
      action: query.action,
      actorUid: query.actorUid,
      from: query.from,
      to: query.to,
    };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const result = await this.auditQueryPort.findPaginated(
      filters,
      page,
      limit,
    );

    return {
      data: result.data.map((e) => this.toEntryDto(e)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  private toEntryDto(entry: OperationalAuditEntry): AuditLogEntryDto {
    const rawId =
      entry.id ?? (entry as unknown as Record<string, unknown>)["_id"];
    const rawCreatedAt = entry.createdAt;

    return {
      id: rawId != null ? String(rawId) : "",
      action: entry.action,
      actorUid: entry.actorUid,
      targetUid: entry.targetUid ?? null,
      targetId: entry.targetId ?? null,
      details: entry.details,
      timestamp: entry.timestamp,
      createdAt:
        rawCreatedAt instanceof Date
          ? rawCreatedAt.toISOString()
          : typeof rawCreatedAt === "string"
            ? rawCreatedAt
            : new Date(entry.timestamp).toISOString(),
    };
  }
}
