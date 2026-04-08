import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateDoctorDto {
  @ApiProperty({
    description: "Nombre completo del médico",
    example: "Dr. Juan García",
    maxLength: 100,
  })
  @IsNotEmpty({ message: "El nombre es obligatorio" })
  @IsString({ message: "El nombre debe ser texto" })
  @MaxLength(100, { message: "El nombre no puede superar 100 caracteres" })
  name!: string;

  @ApiProperty({
    description: "Especialidad médica",
    example: "Medicina General",
    maxLength: 100,
  })
  @IsNotEmpty({ message: "La especialidad es obligatoria" })
  @IsString({ message: "La especialidad debe ser texto" })
  @MaxLength(100, {
    message: "La especialidad no puede superar 100 caracteres",
  })
  specialty!: string;
}
