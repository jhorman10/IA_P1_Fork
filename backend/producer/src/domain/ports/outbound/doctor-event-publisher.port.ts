/**
 * Outbound Port: Doctor Event Publisher
 * SPEC-003: Publica eventos de ciclo de vida de médicos a RabbitMQ.
 */
export interface DoctorCheckedInEvent {
  doctorId: string;
  doctorName: string;
  office: string;
  timestamp: number;
}

export interface DoctorEventPublisherPort {
  publishDoctorCheckedIn(event: DoctorCheckedInEvent): Promise<void>;
}
