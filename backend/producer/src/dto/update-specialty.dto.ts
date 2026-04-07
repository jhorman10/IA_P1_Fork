import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * SPEC-015: Payload para PATCH /specialties/:id (admin-only).
 */
export class UpdateSpecialtyDto {
  @ApiProperty({
    description: "Nuevo nombre de la especialidad",
    example: "Medicina General",
    maxLength: 100,
  })
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  @IsString({ message: "El nombre debe ser texto" })
  @MaxLength(100, { message: "El nombre no puede superar 100 caracteres" })
  name!: string;
}
