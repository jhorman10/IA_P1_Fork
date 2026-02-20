/**
 * Typed payload for appointment notifications sent via RabbitMQ.
 * ⚕️ HUMAN CHECK - H-03 Fix: Reemplaza el tipo de retorno `any` en RmqNotificationAdapter.mapToPayload()
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
