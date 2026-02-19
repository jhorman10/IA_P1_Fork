import { Body, Controller, Get, HttpCode, Inject, Param, Post, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateAppointmentUseCase } from './domain/ports/inbound/create-appointment.use-case';
import { QueryAppointmentsUseCase } from './domain/ports/inbound/query-appointments.use-case';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentEventPayload } from './types/appointment-event';

// ⚕️ HUMAN CHECK - Hexagonal: Controller depends ONLY on inbound ports (DIP).
// Commands (POST) → CreateAppointmentUseCase
// Queries (GET) → QueryAppointmentsUseCase

interface CreateAppointmentResponse {
    status: string;
    message: string;
}

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
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'accepted' },
                message: { type: 'string', example: 'Asignación de turno en progreso' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid data — missing fields, incorrect types, or forbidden properties',
    })
    async createAppointment(@Body() dto: CreateAppointmentDto): Promise<CreateAppointmentResponse> {
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

    @Get()
    @ApiOperation({
        summary: 'List all appointments',
        description:
            'Returns all appointments in the system ordered by ascending timestamp. ' +
            'Includes waiting, called, and completed appointments.',
    })
    @ApiResponse({
        status: 200,
        description: 'List of appointments',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', example: 'uuid' },
                    fullName: { type: 'string', example: 'John Doe' },
                    idCard: { type: 'number', example: 123456789 },
                    office: { type: 'string', example: '3', nullable: true },
                    status: { type: 'string', example: 'called', enum: ['waiting', 'called', 'completed'] },
                    priority: { type: 'string', example: 'medium', enum: ['high', 'medium', 'low'] },
                    timestamp: { type: 'number', example: 1710000000 },
                },
            },
        },
    })
    async getAllAppointments(): Promise<AppointmentEventPayload[]> {
        return this.queryAppointmentsUseCase.findAll();
    }

    @Get(':idCard')
    @ApiOperation({
        summary: 'Query appointments by patient ID card',
        description:
            'Search for all appointments assigned to a patient using their ID card number. ' +
            'Returns the list of appointments with assigned office and status.',
    })
    @ApiParam({
        name: 'idCard',
        description: 'Patient ID card number',
        example: 123456789,
    })
    @ApiResponse({
        status: 200,
        description: 'Appointments found for the patient',
    })
    @ApiResponse({
        status: 404,
        description: 'No appointments found for the provided ID card',
    })
    async getAppointmentsByIdCard(@Param('idCard', ParseIntPipe) idCard: number): Promise<AppointmentEventPayload[]> {
        return this.queryAppointmentsUseCase.findByIdCard(idCard);
    }
}
