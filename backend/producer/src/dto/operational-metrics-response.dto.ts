import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * SPEC-013: Appointment counts sub-object in OperationalMetricsResponseDto.
 */
export class AppointmentMetricsDto {
  @ApiProperty({ example: 12, description: "Turnos activos en espera" })
  waiting!: number;

  @ApiProperty({ example: 3, description: "Turnos activos en atención" })
  called!: number;

  @ApiProperty({
    example: 45,
    description: "Turnos completados hoy (00:00 UTC)",
  })
  completedToday!: number;
}

/**
 * SPEC-013: Doctor availability counts sub-object in OperationalMetricsResponseDto.
 */
export class DoctorMetricsDto {
  @ApiProperty({ example: 2, description: "Médicos disponibles" })
  available!: number;

  @ApiProperty({ example: 3, description: "Médicos en consulta" })
  busy!: number;

  @ApiProperty({ example: 0, description: "Médicos desconectados" })
  offline!: number;
}

/**
 * SPEC-013: Performance KPIs sub-object in OperationalMetricsResponseDto.
 */
export class PerformanceMetricsDto {
  @ApiPropertyOptional({
    example: 8.5,
    nullable: true,
    description:
      "Tiempo promedio de espera en minutos (null si no hay datos suficientes)",
  })
  avgWaitTimeMinutes!: number | null;

  @ApiPropertyOptional({
    example: 12.3,
    nullable: true,
    description:
      "Tiempo promedio de consulta en minutos (null si no hay datos suficientes)",
  })
  avgConsultationTimeMinutes!: number | null;

  @ApiProperty({ example: 7.5, description: "Turnos completados por hora hoy" })
  throughputPerHour!: number;
}

/**
 * SPEC-013: Full response DTO for GET /metrics.
 */
export class OperationalMetricsResponseDto {
  @ApiProperty({ type: AppointmentMetricsDto })
  appointments!: AppointmentMetricsDto;

  @ApiProperty({ type: DoctorMetricsDto })
  doctors!: DoctorMetricsDto;

  @ApiProperty({ type: PerformanceMetricsDto })
  performance!: PerformanceMetricsDto;

  @ApiProperty({
    example: "2026-04-05T14:30:00.000Z",
    description: "Timestamp ISO 8601 de generación de las métricas",
  })
  generatedAt!: string;
}
