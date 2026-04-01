import { Controller, Get, Inject, Param, ParseIntPipe } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

import { GetQueuePositionUseCase } from "../domain/ports/inbound/get-queue-position.use-case";
import { QueryAppointmentsUseCase } from "../domain/ports/inbound/query-appointments.use-case";
import { AppointmentResponseDto } from "../dto/appointment-response.dto";
import { QueuePositionResponseDto } from "../dto/queue-position-response.dto";
import { AppointmentMapper } from "../mappers/appointment.mapper";

@ApiTags("Appointments")
@Controller("appointments")
export class AppointmentQueryController {
  constructor(
    @Inject("QueryAppointmentsUseCase")
    private readonly queryAppointmentsUseCase: QueryAppointmentsUseCase,
    @Inject("GetQueuePositionUseCase")
    private readonly getQueuePositionUseCase: GetQueuePositionUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: "List all appointments",
    description:
      "Returns all appointments in the system ordered by ascending timestamp. " +
      "Includes waiting, called, and completed appointments.",
  })
  @ApiResponse({
    status: 200,
    description: "List of appointments",
    type: [AppointmentResponseDto],
  })
  async getAllAppointments(): Promise<AppointmentResponseDto[]> {
    const events = await this.queryAppointmentsUseCase.findAll();
    return AppointmentMapper.toResponseDtoList(events);
  }

  // SPEC-003: Must be declared before /:idCard to avoid route shadowing
  @Get("queue-position/:idCard")
  @ApiOperation({
    summary: "Obtener posición en cola de un paciente",
    description:
      "Calcula la posición ordinal (1-based) del paciente en la cola de espera, " +
      "ordenada por prioridad (Alta > Media > Baja) y FIFO.",
  })
  @ApiParam({
    name: "idCard",
    description: "Cédula del paciente",
    example: 123456789,
  })
  @ApiResponse({
    status: 200,
    description: "Posición en cola",
    type: QueuePositionResponseDto,
  })
  async getQueuePosition(
    @Param("idCard", ParseIntPipe) idCard: number,
  ): Promise<QueuePositionResponseDto> {
    return this.getQueuePositionUseCase.execute(idCard);
  }

  @Get(":idCard")
  @ApiOperation({
    summary: "Query appointments by patient ID card",
    description:
      "Search for all appointments assigned to a patient using their ID card number. " +
      "Returns the list of appointments with assigned office and status.",
  })
  @ApiParam({
    name: "idCard",
    description: "Patient ID card number",
    example: 123456789,
  })
  @ApiResponse({
    status: 200,
    description: "Appointments found for the patient",
    type: [AppointmentResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: "No appointments found for the provided ID card",
  })
  async getAppointmentsByIdCard(
    @Param("idCard", ParseIntPipe) idCard: number,
  ): Promise<AppointmentResponseDto[]> {
    const events = await this.queryAppointmentsUseCase.findByIdCard(idCard);
    return AppointmentMapper.toResponseDtoList(events);
  }
}
