import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { ProfileRole, ProfileStatus } from "../schemas/profile.schema";

/**
 * SPEC-004: Response DTO for a Profile resource.
 * Used by GET /profiles/me, POST /profiles, PATCH /profiles/:uid.
 */
export class ProfileResponseDto {
  @ApiProperty({ example: "firebase_uid_123" })
  uid!: string;

  @ApiProperty({ example: "admin@clinic.local" })
  email!: string;

  @ApiProperty({ example: "Admin Central" })
  display_name!: string;

  @ApiProperty({ enum: ["admin", "recepcionista", "doctor"], example: "admin" })
  role!: ProfileRole;

  @ApiProperty({ enum: ["active", "inactive"], example: "active" })
  status!: ProfileStatus;

  @ApiPropertyOptional({ example: null, nullable: true })
  doctor_id!: string | null;

  @ApiPropertyOptional({ example: "2026-04-05T14:00:00Z" })
  created_at?: Date;

  @ApiPropertyOptional({ example: "2026-04-05T14:00:00Z" })
  updated_at?: Date;
}
