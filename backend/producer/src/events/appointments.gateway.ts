import { Logger, UseGuards } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AppointmentService } from '../appointments/appointment.service';
import { AppointmentEventPayload } from '../types/appointment-event';
import { WsAuthGuard } from '../common/guards/ws-auth.guard';

// 🛡️ HUMAN CHECK - WebSocket Gateway Hardened
// ⚕️ HUMAN CHECK - DIP: Depends on AppointmentService facade (which depends on port)
@UseGuards(WsAuthGuard)
@WebSocketGateway({
    namespace: '/ws/appointments',
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        credentials: true,
    },
})
export class AppointmentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(AppointmentsGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private readonly appointmentService: AppointmentService) { }

    async handleConnection(client: Socket): Promise<void> {
        this.logger.log(`Client connected: ${client.id}`);

        try {
            const snapshot = await this.appointmentService.findAll();

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
