/**
 * Typed payload for appointment notifications sent via RabbitMQ.
 * ⚕️ HUMAN CHECK - H-03 Fix: Replaces `any` return type in RmqNotificationAdapter.mapToPayload()
 */
export interface AppointmentNotificationPayload {
    id: string;
    fullName: string;
    idCard: number;
    office: string | null;
    status: string;
    priority: string;
    timestamp: number;
    completedAt?: number;
}
