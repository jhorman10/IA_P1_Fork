import { Injectable } from "@nestjs/common";

import { EventBroadcasterPort } from "../domain/ports/outbound/event-broadcaster.port";
import { AppointmentEventPayload } from "../types/appointment-event";
import { AppointmentsGateway } from "./appointments.gateway";
import { OperationalAppointmentsGateway } from "./operational-appointments.gateway";

/**
 * CompoundBroadcaster: Delegates broadcastAppointmentUpdated to both WebSocket
 * gateways so all connected clients (public + operational) receive real-time updates.
 *
 * Implements EventBroadcasterPort (DIP) — wired in EventsModule.
 */
@Injectable()
export class CompoundBroadcaster implements EventBroadcasterPort {
  constructor(
    private readonly appointmentsGateway: AppointmentsGateway,
    private readonly operationalGateway: OperationalAppointmentsGateway,
  ) {}

  broadcastAppointmentUpdated(appointment: AppointmentEventPayload): void {
    this.appointmentsGateway.broadcastAppointmentUpdated(appointment);
    this.operationalGateway.broadcastAppointmentUpdated(appointment);
  }
}
