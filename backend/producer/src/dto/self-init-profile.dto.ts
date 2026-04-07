import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

import { ProfileRole } from "../schemas/profile.schema";

/**
 * SPEC-006: Payload for POST /profiles/self/initialize.
 * Allows an authenticated user to self-create their own operational Profile.
 * Admin role is not allowed — only recepcionista or doctor.
 */
export class SelfInitProfileDto {
  @ApiProperty({
    description: "Correo institucional del Usuario",
    example: "recep@clinic.local",
    maxLength: 254,
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: "Nombre visible en la interfaz",
    example: "Ana López",
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  display_name!: string;

  @ApiPropertyOptional({
    description:
      "Rol operativo deseado. Solo recepcionista o doctor (admin no permitido por seguridad).",
    enum: ["recepcionista", "doctor"],
    example: "recepcionista",
    default: "recepcionista",
  })
  @IsOptional()
  @IsIn(["recepcionista", "doctor"] as Array<
    Extract<ProfileRole, "recepcionista" | "doctor">
  >)
  role?: Extract<ProfileRole, "recepcionista" | "doctor">;
}
