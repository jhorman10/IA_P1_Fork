import { Inject, Logger, UseGuards } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { QueryAppointmentsUseCase } from '../domain/ports/inbound/query-appointments.use-case';
import { EventBroadcasterPort } from '../domain/ports/outbound/event-broadcaster.port';
import { AppointmentEventPayload } from '../types/appointment-event';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';

// 🛡️ HUMAN CHECK - WebSocket Gateway Hardened
// ⚕️ HUMAN CHECK - Hexagonal: Implements EventBroadcasterPort (DIP)
// EXCEPCIÓN: El uso de process.env en el decorador @WebSocketGateway es necesario porque los decoradores se evalúan en tiempo de compilación.
// NestJS no permite inyectar ConfigService en decoradores. El acceso a variables de entorno en tiempo de ejecución se realiza vía ConfigService (ver afterInit()).
@UseGuards(WsAuthGuard)
@WebSocketGateway({
    namespace: '/ws/appointments',
    cors: {
        // 🛡️ HUMAN CHECK - H-08 Fix: Restrict origin to Frontend URL.
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        credentials: true,
    },
})
export class AppointmentsGateway
    implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, EventBroadcasterPort {
    private readonly logger = new Logger(AppointmentsGateway.name);

    @WebSocketServer()
    server!: Server;

    constructor(
        @Inject('QueryAppointmentsUseCase')
        private readonly queryAppointmentsUseCase: QueryAppointmentsUseCase,
        private readonly configService: ConfigService,
    ) { }

    /**
     * ⚕️ HUMAN CHECK - H-02 Fix: CORS origin configured via environment variable
     * in the @WebSocketGateway decorator. The decorator evaluates at compile-time,
     * so ConfigService cannot be used there — process.env is the only viable option.
     * ConfigService is used for runtime logging confirmation only.
     */
    afterInit(): void {
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
        this.logger.log(`WebSocket CORS configured for origin: ${frontendUrl}`);
    }

    async handleConnection(client: Socket): Promise<void> {
        this.logger.log(`Client connected: ${client.id}`);

        try {
            const snapshot = await this.queryAppointmentsUseCase.findAll();

            client.emit('APPOINTMENTS_SNAPSHOT', {
                type: 'APPOINTMENTS_SNAPSHOT',
                data: snapshot,
            });

            this.logger.log(`Snapshot sent to ${client.id} — ${snapshot.length} appointments`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Error sending snapshot to ${client.id}: ${message}`);
        }
    }

    handleDisconnect(client: Socket): void {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * Broadcast an appointment update.
     * Implements EventBroadcasterPort.
     */
    broadcastAppointmentUpdated(appointment: AppointmentEventPayload): void {
        this.server.emit('APPOINTMENT_UPDATED', {
            type: 'APPOINTMENT_UPDATED',
            data: appointment,
        });

        this.logger.log(
            `Broadcast APPOINTMENT_UPDATED — ${appointment.fullName} (status: ${appointment.status}, office: ${appointment.office ?? 'N/A'})`,
        );
    }
}
