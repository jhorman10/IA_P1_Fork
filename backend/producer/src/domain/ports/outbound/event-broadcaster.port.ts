import { AppointmentEventPayload } from "../../../types/appointment-event";

/**
 * Outbound Port: Event Broadcasting
 * ⚕️ HUMAN CHECK - DIP: EventsController depende de esta interfaz, no del WebSocket Gateway.
 */
export interface EventBroadcasterPort {
  broadcastAppointmentUpdated(appointment: AppointmentEventPayload): void;
}
