import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString, MaxLength } from "class-validator";

import {
  DOCTOR_OFFICE_RANGE_MESSAGE,
  VALID_DOCTOR_OFFICES,
} from "../doctors/doctor-office.constants";

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

  @ApiProperty({
    description: "Consultorio asignado al médico (solo 1 a 5)",
    example: "3",
    enum: VALID_DOCTOR_OFFICES,
  })
  @IsNotEmpty({ message: "El consultorio es obligatorio" })
  @IsString({ message: "El consultorio debe ser texto" })
  @IsIn(VALID_DOCTOR_OFFICES, {
    message: DOCTOR_OFFICE_RANGE_MESSAGE,
  })
  office!: string;
}
