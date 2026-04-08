import { ApiProperty } from "@nestjs/swagger";

import {
  AppointmentPriority,
  AppointmentStatus,
} from "../types/appointment-event";

export class QueuePositionResponseDto {
  @ApiProperty({ example: 123456789, description: "Cédula del paciente" })
  idCard!: number;

  @ApiProperty({
    example: 3,
    description: "Posición en cola (1-based). 0 si no está en cola.",
  })
  position!: number;

  @ApiProperty({
    example: 7,
    description: "Total de pacientes en estado waiting",
  })
  total!: number;

  @ApiProperty({
    example: "waiting",
    description: 'Estado del turno, o "not_found" si no hay turno activo',
  })
  status!: AppointmentStatus | "not_found";

  @ApiProperty({
    example: "high",
    nullable: true,
    description: "Prioridad del turno, null si no hay turno activo",
  })
  priority!: AppointmentPriority | null;
}
