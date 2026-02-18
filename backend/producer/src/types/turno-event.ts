// ⚕️ HUMAN CHECK - Domain types for Appointment
// These types centralize definitions for states, priorities, and payloads
// to ensure type safety and consistency across services.

/**
 * Valid states for the appointment lifecycle
 */
export type AppointmentStatus = 'waiting' | 'called' | 'completed';

/**
 * Valid priorities for office assignment
 */
export type AppointmentPriority = 'high' | 'medium' | 'low';

/**
 * Standardized payload for RabbitMQ and WebSocket events.
 * Used by: Consumer (emit), Producer (receive + broadcast), Frontend (receive).
 */
export interface AppointmentEventPayload {
    id: string;
    fullName: string;
    idCard: number;
    office: string | null;
    status: AppointmentStatus;
    priority: AppointmentPriority;
    timestamp: number;
    completedAt?: number;
}
