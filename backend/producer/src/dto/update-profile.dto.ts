import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

import { ProfileRole, ProfileStatus } from "../schemas/profile.schema";

/**
 * SPEC-004: Payload for PATCH /profiles/:uid (admin-only).
 * All fields are optional — partial update.
 * SPEC-006: reason field added for profile audit log.
 */
export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: "Nuevo rol operativo",
    enum: ["admin", "recepcionista", "doctor"],
    example: "recepcionista",
  })
  @IsOptional()
  @IsIn(["admin", "recepcionista", "doctor"] as ProfileRole[])
  role?: ProfileRole;

  @ApiPropertyOptional({
    description: "Nuevo estado del Perfil",
    enum: ["active", "inactive"],
    example: "inactive",
  })
  @IsOptional()
  @IsIn(["active", "inactive"] as ProfileStatus[])
  status?: ProfileStatus;

  @ApiPropertyOptional({
    description: "Actualizar referencia al Doctor vinculado",
    example: "67f01abc1234def567890123",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  doctor_id?: string | null;

  @ApiPropertyOptional({
    description:
      "ID de especialidad del catálogo (solo aplica cuando role final es doctor)",
    example: "67f01abc1234def567890abc",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  specialty_id?: string;

  @ApiPropertyOptional({
    description: "Motivo del cambio (para auditoría de perfil)",
    example: "Promoción a administrador por retiro del titular",
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
