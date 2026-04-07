import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * SPEC-016: Response DTO para GET /offices — consultorio con metadatos operativos.
 */
export class OfficeResponseDto {
  @ApiProperty({ example: "1" })
  number!: string;

  @ApiProperty({ example: true })
  enabled!: boolean;

  @ApiProperty({ example: false })
  occupied!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, example: "65f0c1..." })
  occupiedByDoctorId!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: "Dra. Ana Pérez",
  })
  occupiedByDoctorName!: string | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    enum: ["available", "busy"],
  })
  occupiedByStatus!: string | null;

  @ApiProperty({ example: true })
  canDisable!: boolean;

  @ApiProperty({ example: "2026-04-06T10:00:00.000Z" })
  createdAt!: Date;

  @ApiProperty({ example: "2026-04-06T10:00:00.000Z" })
  updatedAt!: Date;
}
