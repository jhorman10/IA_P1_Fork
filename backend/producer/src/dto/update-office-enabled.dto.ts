import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

/**
 * SPEC-016: Payload para PATCH /offices/:number.
 * Habilita o deshabilita un consultorio existente.
 */
export class UpdateOfficeEnabledDto {
  @ApiProperty({
    description: "Estado habilitado/deshabilitado del consultorio",
    example: false,
  })
  @IsBoolean({ message: "enabled debe ser un booleano" })
  enabled!: boolean;
}
