import { AppointmentEventPayload } from '../../../types/appointment-event';

/**
 * Outbound Port: Event Broadcasting
 * ⚕️ HUMAN CHECK - DIP: EventsController depends on this interface, not the WebSocket Gateway.
 */
export interface EventBroadcasterPort {
    broadcastAppointmentUpdated(appointment: AppointmentEventPayload): void;
}
