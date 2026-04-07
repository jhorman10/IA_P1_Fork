import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches } from "class-validator";

/**
 * SPEC-015: Payload para PATCH /doctors/:id/check-in.
 * SPEC-016: La validación de existencia/habilitación del consultorio se hace dinámicamente
 * en la capa de servicio contra el catálogo Office; ya no se aplica IsIn con lista fija.
 */
export class CheckInDto {
  @ApiProperty({
    description: "Número del consultorio elegido para el check-in",
    example: "3",
  })
  @IsNotEmpty({ message: "El consultorio es obligatorio" })
  @IsString({ message: "El consultorio debe ser texto" })
  @Matches(/^[1-9][0-9]*$/, {
    message: "El consultorio debe ser un número positivo válido",
  })
  office!: string;
}
