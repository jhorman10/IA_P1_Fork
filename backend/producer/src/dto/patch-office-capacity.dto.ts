import { ApiProperty } from "@nestjs/swagger";
import { IsInt, Min } from "class-validator";

/**
 * SPEC-016: Payload para PATCH /offices/capacity.
 * Define la capacidad objetivo de consultorios.
 */
export class PatchOfficeCapacityDto {
  @ApiProperty({
    description:
      "Número objetivo total de consultorios. Debe ser mayor o igual al máximo existente.",
    example: 8,
    minimum: 1,
  })
  @IsInt({ message: "target_total debe ser un número entero" })
  @Min(1, { message: "target_total debe ser al menos 1" })
  target_total!: number;
}
