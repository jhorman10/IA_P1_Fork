/**
 * SPEC-012: Outbound port — publishes lifecycle events for appointments.
 * Implemented by RabbitMQLifecyclePublisherAdapter.
 */
export interface CompleteAppointmentEvent {
  appointmentId: string;
  actorUid: string;
  timestamp: number;
}

export interface CancelAppointmentEvent {
  appointmentId: string;
  actorUid: string;
  timestamp: number;
}

export interface AppointmentLifecyclePublisherPort {
  publishCompleteAppointment(event: CompleteAppointmentEvent): Promise<void>;
  publishCancelAppointment(event: CancelAppointmentEvent): Promise<void>;
}

export const LIFECYCLE_PUBLISHER_TOKEN = "AppointmentLifecyclePublisherPort";
