import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { OperationalAuditAction } from "../domain/ports/outbound/operational-audit.port";

/**
 * SPEC-011: Single audit log entry in the GET /audit-logs response.
 */
export class AuditLogEntryDto {
  @ApiProperty({ example: "665a1b2c3d4e5f6a7b8c9d0e" })
  id!: string;

  @ApiProperty({ example: "PROFILE_CREATED" })
  action!: OperationalAuditAction;

  @ApiProperty({ example: "firebase-uid-admin" })
  actorUid!: string;

  @ApiPropertyOptional({ example: "firebase-uid-new-user", nullable: true })
  targetUid!: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  targetId!: string | null;

  @ApiProperty({
    type: Object,
    example: { role: "doctor", email: "dr@clinic.co" },
  })
  details!: Record<string, unknown>;

  @ApiProperty({ example: 1712345678000 })
  timestamp!: number;

  @ApiProperty({ example: "2026-04-05T14:21:18.000Z" })
  createdAt!: string;
}

/**
 * SPEC-011: Paginated response for GET /audit-logs.
 */
export class AuditLogPageDto {
  @ApiProperty({ type: [AuditLogEntryDto] })
  data!: AuditLogEntryDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 3 })
  totalPages!: number;
}
