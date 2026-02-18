import { Logger } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TurnosService } from '../appointments/turnos.service';
import { AppointmentEventPayload } from '../types/appointment-event';

// ⚕️ HUMAN CHECK - WebSocket Gateway
@WebSocketGateway({
    namespace: '/ws/appointments',
    cors: {
        origin: '*',
    },
})
export class TurnosGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(TurnosGateway.name);

    @WebSocketServer()
    server: Server;

    constructor(private readonly turnosService: TurnosService) { }

    async handleConnection(client: Socket): Promise<void> {
        this.logger.log(`Client connected: ${client.id}`);

        try {
            const appointments = await this.turnosService.findAll();
            const snapshot: AppointmentEventPayload[] = appointments.map(t =>
                this.turnosService.toEventPayload(t),
            );

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
