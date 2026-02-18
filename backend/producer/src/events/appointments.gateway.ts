import { Logger } from '@nestjs/common';
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AppointmentService } from '../appointments/appointment.service';
import { AppointmentEventPayload } from '../types/appointment-event';

// ⚕️ HUMAN CHECK - WebSocket Gateway
@WebSocketGateway({
    namespace: '/ws/appointments',
    cors: {
        origin: '*',
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
            const appointments = await this.appointmentService.findAll();
            const snapshot: AppointmentEventPayload[] = appointments.map(t =>
                this.appointmentService.toEventPayload(t),
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
