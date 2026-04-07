import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { OperationalAuditAction } from "../domain/ports/outbound/operational-audit.port";

const VALID_ACTIONS: OperationalAuditAction[] = [
  "PROFILE_CREATED",
  "PROFILE_UPDATED",
  "DOCTOR_CHECK_IN",
  "DOCTOR_CHECK_OUT",
  "DOCTOR_CREATED",
  "APPOINTMENT_CREATED",
  "SESSION_RESOLVED",
];

/**
 * SPEC-011: Query parameters for GET /audit-logs.
 */
export class AuditLogQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: "Página (1-based)",
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: "Registros por página (max 100)",
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(value as string, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: VALID_ACTIONS,
    description: "Filtrar por tipo de acción",
  })
  @IsOptional()
  @IsString()
  @IsIn(VALID_ACTIONS)
  action?: OperationalAuditAction;

  @ApiPropertyOptional({ description: "Filtrar por Firebase UID del actor" })
  @IsOptional()
  @IsString()
  actorUid?: string;

  @ApiPropertyOptional({
    description: "Timestamp mínimo (epoch ms, inclusive)",
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const n = parseInt(value as string, 10);
    return Number.isNaN(n) ? undefined : n;
  })
  @IsNumber()
  from?: number;

  @ApiPropertyOptional({
    description: "Timestamp máximo (epoch ms, inclusive)",
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    const n = parseInt(value as string, 10);
    return Number.isNaN(n) ? undefined : n;
  })
  @IsNumber()
  to?: number;
}
