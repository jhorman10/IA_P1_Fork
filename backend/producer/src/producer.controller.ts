import { Body, Controller, Get, HttpCode, Inject, Param, Post, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateAppointmentUseCase } from './domain/ports/inbound/create-appointment.use-case';
import { QueryAppointmentsUseCase } from './domain/ports/inbound/query-appointments.use-case';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CreateAppointmentResponseDto } from './dto/create-appointment-response.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AppointmentMapper } from './mappers/appointment.mapper';

// ⚕️ HUMAN CHECK - Hexagonal: Controller depends ONLY on inbound ports (DIP).
// Commands (POST) → CreateAppointmentUseCase
// Queries (GET) → QueryAppointmentsUseCase

@ApiTags('Appointments')
@Controller('appointments')
export class ProducerController {
    constructor(
        @Inject('CreateAppointmentUseCase')
        private readonly createAppointmentUseCase: CreateAppointmentUseCase,
        @Inject('QueryAppointmentsUseCase')
        private readonly queryAppointmentsUseCase: QueryAppointmentsUseCase,
    ) { }

    @Post()
    @HttpCode(202)
    @ApiOperation({
        summary: 'Create a new appointment',
        description:
            'Receives patient data, validates payload, and sends message to RabbitMQ queue ' +
            'for asynchronous processing. The Consumer creates the appointment in "waiting" state ' +
            'and the scheduler assigns an office. Changes are emitted via WebSocket.',
    })
    @ApiBody({ type: CreateAppointmentDto })
    @ApiResponse({
        status: 202,
        description: 'Appointment accepted and queued for processing',
        type: CreateAppointmentResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid data — missing fields, incorrect types, or forbidden properties',
    })
    async createAppointment(@Body() dto: CreateAppointmentDto): Promise<CreateAppointmentResponseDto> {
        // 1. Map DTO (HTTP) → Command (Domain)
        // ⚕️ HUMAN CHECK - SRP: Controller handles data mapping, not the Use Case.
        const command = {
            idCard: dto.idCard,
            fullName: dto.fullName,
        };

        // 2. Execute Use Case (Business Logic)
        await this.createAppointmentUseCase.execute(command);

        // 3. Construct Response (Presentation Logic)
        return {
            status: 'accepted',
            message: 'Asignación de turno en progreso',
        };
    }


}
