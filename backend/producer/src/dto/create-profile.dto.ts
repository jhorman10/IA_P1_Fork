import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { ProfileRole } from "../schemas/profile.schema";

/**
 * SPEC-004: Payload for POST /profiles (admin-only).
 * Accepts email + password; the controller creates the Firebase user
 * and derives the UID automatically.
 */
export class CreateProfileDto {
  @ApiProperty({
    description: "Correo institucional del Usuario",
    example: "doctor@clinic.local",
    maxLength: 254,
  })
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    description: "Contraseña para la cuenta Firebase",
    example: "SecureP@ss123",
    minLength: 6,
    maxLength: 128,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string;

  @ApiProperty({
    description: "Nombre visible en la interfaz",
    example: "Dr. Laura Torres",
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  display_name!: string;

  @ApiProperty({
    description: "Rol operativo del Usuario",
    enum: ["admin", "recepcionista", "doctor"],
    example: "doctor",
  })
  @IsNotEmpty()
  @IsIn(["admin", "recepcionista", "doctor"] as ProfileRole[])
  role!: ProfileRole;

  @ApiPropertyOptional({
    description:
      "Referencia al Doctor vinculado (retrocompatibilidad). " +
      "Para rol doctor: usar specialty_id en su lugar (creación transparente).",
    example: "67f01abc1234def567890123",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  doctor_id?: string | null;

  @ApiPropertyOptional({
    description:
      "ID de especialidad del catálogo. Requerido al crear perfil con rol doctor. " +
      "El sistema creará la entidad Doctor de forma transparente.",
    example: "abc123def456",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  specialty_id?: string | null;
}
