import { Body, Controller, Get, HttpCode, Param, Post, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ProducerService, CreateAppointmentResponse } from './producer.service';
import { AppointmentService } from './appointments/appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentEventPayload } from './types/appointment-event';

// ⚕️ HUMAN CHECK - SRP: Single responsibility per method.
// Commands (POST) delegate to ProducerService (publish).
// Queries (GET) delegate to AppointmentService (read facade).

@ApiTags('Appointments')
@Controller('appointments')
export class ProducerController {
    constructor(
        private readonly producerService: ProducerService,
        private readonly appointmentService: AppointmentService,
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
                message: { type: 'string', example: 'Appointment assignment in progress' },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid data — missing fields, incorrect types, or forbidden properties',
    })
    async createAppointment(@Body() createAppointmentDto: CreateAppointmentDto): Promise<CreateAppointmentResponse> {
        return this.producerService.createAppointment(createAppointmentDto);
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
        return this.appointmentService.findAll();
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
        return this.appointmentService.findByIdCard(idCard);
    }
}
