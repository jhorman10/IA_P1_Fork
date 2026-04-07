/**
 * SPEC-012: Outbound port — publishes lifecycle events for appointments.
 * SPEC-003: Also publishes doctor_checked_in for reactive assignment.
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

export interface DoctorCheckedInEvent {
  doctorId: string;
  timestamp: number;
}

export interface AppointmentLifecyclePublisherPort {
  publishCompleteAppointment(event: CompleteAppointmentEvent): Promise<void>;
  publishCancelAppointment(event: CancelAppointmentEvent): Promise<void>;
  publishDoctorCheckedIn(event: DoctorCheckedInEvent): Promise<void>;
}

export const LIFECYCLE_PUBLISHER_TOKEN = "AppointmentLifecyclePublisherPort";
