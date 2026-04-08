import { ApiProperty } from "@nestjs/swagger";

export class DoctorResponseDto {
  @ApiProperty({
    example: "64b1c2d3e4f5a6b7c8d9e0f1",
    description: "ID único del médico (MongoDB ObjectId)",
  })
  id!: string;

  @ApiProperty({ example: "Dr. Juan García", description: "Nombre completo" })
  name!: string;

  @ApiProperty({
    example: "Medicina General",
    description: "Especialidad médica",
  })
  specialty!: string;

  @ApiProperty({
    example: "3",
    nullable: true,
    description: "Consultorio operativo actual. null cuando offline.",
  })
  office!: string | null;

  @ApiProperty({
    enum: ["available", "busy", "offline"],
    example: "offline",
    description: "Estado de disponibilidad actual",
  })
  status!: string;

  @ApiProperty({
    example: "2026-04-01T10:00:00Z",
    description: "Fecha de registro",
  })
  createdAt?: Date;

  @ApiProperty({
    example: "2026-04-01T10:00:00Z",
    description: "Última actualización",
  })
  updatedAt?: Date;
}
