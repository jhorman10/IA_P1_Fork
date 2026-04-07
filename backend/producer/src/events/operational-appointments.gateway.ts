import { Inject, Logger, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

import { WsFirebaseAuthGuard } from "../auth/guards/ws-firebase-auth.guard";
import { QueryAppointmentsUseCase } from "../domain/ports/inbound/query-appointments.use-case";
import { EventBroadcasterPort } from "../domain/ports/outbound/event-broadcaster.port";
import { AppointmentEventPayload } from "../types/appointment-event";

/**
 * SPEC-010: Operational WebSocket namespace authenticated via Firebase idToken.
 *
 * Namespace: /ws/operational-appointments
 * Auth:      WsFirebaseAuthGuard (Firebase idToken + active Profile)
 * Events:    APPOINTMENTS_SNAPSHOT (on connect), APPOINTMENT_UPDATED (broadcast)
 *
 * EXCEPCIÓN: process.env en el decorador es necesario — los decoradores se evalúan
 * en tiempo de compilación; ConfigService se usa solo para validación en afterInit().
 */
// ⚕️ HUMAN CHECK - SPEC-010: Namespace operativo autenticado con Firebase
@UseGuards(WsFirebaseAuthGuard)
@WebSocketGateway({
  namespace: "/ws/operational-appointments",
  cors: {
    // 🛡️ HUMAN CHECK - H-08: Restringe el origen a la URL del Frontend.
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class OperationalAppointmentsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    EventBroadcasterPort
{
  private readonly logger = new Logger(OperationalAppointmentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject("QueryAppointmentsUseCase")
    private readonly queryAppointmentsUseCase: QueryAppointmentsUseCase,
    private readonly configService: ConfigService,
    private readonly wsFirebaseAuthGuard: WsFirebaseAuthGuard,
  ) {}

  afterInit(): void {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    if (!frontendUrl) {
      this.logger.error(
        "FRONTEND_URL no está definido. Requerido para CORS/WebSocket operativo.",
      );
      throw new Error("FRONTEND_URL debe estar definido en .env");
    }
    this.logger.log(
      `Operational WebSocket CORS configured for origin: ${frontendUrl}`,
    );
  }

  /**
   * Auth is enforced here at connection time via WsFirebaseAuthGuard.
   * Unauthenticated clients are emitted WS_AUTH_ERROR and disconnected before receiving data.
   */
  async handleConnection(client: Socket): Promise<void> {
    const authenticated =
      await this.wsFirebaseAuthGuard.authenticateSocket(client);

    if (!authenticated) {
      return;
    }

    this.logger.log(`Operational client connected: ${client.id}`);

    try {
      const snapshot = await this.queryAppointmentsUseCase.findAll();

      client.emit("APPOINTMENTS_SNAPSHOT", {
        type: "APPOINTMENTS_SNAPSHOT",
        data: snapshot,
      });

      this.logger.log(
        `Operational snapshot sent to ${client.id} — ${snapshot.length} appointments`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error sending operational snapshot to ${client.id}: ${message}`,
      );
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Operational client disconnected: ${client.id}`);
  }

  /**
   * Broadcasts an appointment update to all authenticated operational clients.
   * Implements EventBroadcasterPort — wired via compound broadcaster in EventsModule.
   */
  broadcastAppointmentUpdated(appointment: AppointmentEventPayload): void {
    this.server.emit("APPOINTMENT_UPDATED", {
      type: "APPOINTMENT_UPDATED",
      data: appointment,
    });

    this.logger.log(
      `Operational broadcast APPOINTMENT_UPDATED — ${appointment.fullName} (status: ${appointment.status})`,
    );
  }
}
