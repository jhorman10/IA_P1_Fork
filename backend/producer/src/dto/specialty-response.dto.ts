import { ApiProperty } from "@nestjs/swagger";

/**
 * SPEC-015: Respuesta de operaciones sobre especialidades.
 */
export class SpecialtyResponseDto {
  @ApiProperty({
    example: "abc123",
    description: "ID único de la especialidad (MongoDB ObjectId)",
  })
  id!: string;

  @ApiProperty({
    example: "Cardiología",
    description: "Nombre de la especialidad",
  })
  name!: string;

  @ApiProperty({
    example: "2026-04-06T10:00:00Z",
    description: "Fecha de creación",
  })
  createdAt!: Date;

  @ApiProperty({
    example: "2026-04-06T10:00:00Z",
    description: "Última actualización",
  })
  updatedAt!: Date;
}
