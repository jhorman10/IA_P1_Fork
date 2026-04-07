import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

/**
 * SPEC-015: Payload para POST /specialties (admin-only).
 */
export class CreateSpecialtyDto {
  @ApiProperty({
    description: "Nombre de la especialidad médica",
    example: "Cardiología",
    maxLength: 100,
  })
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  @IsString({ message: "El nombre debe ser texto" })
  @MaxLength(100, { message: "El nombre no puede superar 100 caracteres" })
  name!: string;
}
