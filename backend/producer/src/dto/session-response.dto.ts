import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ProfileRole, ProfileStatus } from "../schemas/profile.schema";

/**
 * SPEC-004: Response DTO for POST /auth/session.
 * Includes the resolved profile plus the allowed_modules list computed by the backend.
 */
export class SessionResponseDto {
  @ApiProperty({ example: "firebase_uid_123" })
  uid!: string;

  @ApiProperty({ example: "recepcion@clinic.local" })
  email!: string;

  @ApiProperty({ example: "Recepcion Principal" })
  display_name!: string;

  @ApiProperty({
    enum: ["admin", "recepcionista", "doctor"],
    example: "recepcionista",
  })
  role!: ProfileRole;

  @ApiProperty({ enum: ["active", "inactive"], example: "active" })
  status!: ProfileStatus;

  @ApiPropertyOptional({ example: null, nullable: true })
  doctor_id!: string | null;

  @ApiProperty({
    description: "Módulos a los que el rol tiene acceso",
    example: ["registration", "dashboard"],
    type: [String],
  })
  allowed_modules!: string[];
}
