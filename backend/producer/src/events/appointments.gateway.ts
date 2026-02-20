import { Inject, Logger, UseGuards } from "@nestjs/common";
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";
import { QueryAppointmentsUseCase } from "../domain/ports/inbound/query-appointments.use-case";
import { EventBroadcasterPort } from "../domain/ports/outbound/event-broadcaster.port";
import { AppointmentEventPayload } from "../types/appointment-event";
import { WsAuthGuard } from "../common/guards/ws-auth.guard";

// 🛡️ HUMAN CHECK - WebSocket Gateway protegido
// ⚕️ HUMAN CHECK - Hexagonal: Implementa EventBroadcasterPort (DIP)
// EXCEPCIÓN: El uso de process.env en el decorador @WebSocketGateway es necesario porque los decoradores se evalúan en tiempo de compilación.
// NestJS no permite inyectar ConfigService en decoradores. El acceso a variables de entorno en tiempo de ejecución se realiza vía ConfigService (ver afterInit()).
@UseGuards(WsAuthGuard)
@WebSocketGateway({
  namespace: "/ws/appointments",
  cors: {
    // 🛡️ HUMAN CHECK - H-08 Fix: Restringe el origen a la URL del Frontend.
    origin: process.env.FRONTEND_URL, // Zero Magic Numbers: FRONTEND_URL debe estar siempre definido en .env
    credentials: true,
  },
})
export class AppointmentsGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    EventBroadcasterPort
{
  private readonly logger = new Logger(AppointmentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject("QueryAppointmentsUseCase")
    private readonly queryAppointmentsUseCase: QueryAppointmentsUseCase,
    private readonly configService: ConfigService,
  ) {}

  /**
   * ⚕️ HUMAN CHECK - H-02 Fix: Origen de CORS configurado mediante variable de entorno
   * en el decorador @WebSocketGateway. El decorador se evalúa en tiempo de compilación,
   * por lo que ConfigService no puede usarse ahí — process.env es la única opción viable.
   * ConfigService se usa únicamente para confirmar el valor en runtime mediante log.
   */
  afterInit(): void {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL");
    if (!frontendUrl) {
      this.logger.error(
        "FRONTEND_URL no está definido en variables de entorno. Requerido para CORS/WebSocket.",
      );
      throw new Error("FRONTEND_URL debe estar definido en .env");
    }
    this.logger.log(`WebSocket CORS configured for origin: ${frontendUrl}`);
  }

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`Client connected: ${client.id}`);

    try {
      const snapshot = await this.queryAppointmentsUseCase.findAll();

      client.emit("APPOINTMENTS_SNAPSHOT", {
        type: "APPOINTMENTS_SNAPSHOT",
        data: snapshot,
      });

      this.logger.log(
        `Snapshot sent to ${client.id} — ${snapshot.length} appointments`,
      );
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
    this.server.emit("APPOINTMENT_UPDATED", {
      type: "APPOINTMENT_UPDATED",
      data: appointment,
    });

    this.logger.log(
      `Broadcast APPOINTMENT_UPDATED — ${appointment.fullName} (status: ${appointment.status}, office: ${appointment.office ?? "N/A"})`,
    );
  }
}
