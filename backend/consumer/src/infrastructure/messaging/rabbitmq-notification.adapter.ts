import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { NotificationPort } from '../../domain/ports/outbound/notification.port';
import { Appointment } from '../../domain/entities/appointment.entity';

// Pattern: Adapter — Bridges RabbitMQ Client with the Domain Port
// ⚕️ HUMAN CHECK - DIP: Implementa el puerto de notificación usando NestJS ClientProxy

@Injectable()
export class RabbitMQNotificationAdapter implements NotificationPort {
    constructor(
        @Inject('APPOINTMENT_NOTIFICATIONS') private readonly client: ClientProxy,
    ) { }

    async notifyAppointmentUpdated(appointment: Appointment): Promise<void> {
        const payload = {
            id: appointment.id,
            fullName: appointment.fullName,
            idCard: appointment.idCard,
            office: appointment.office,
            status: appointment.status,
            priority: appointment.priority,
            timestamp: appointment.timestamp,
            completedAt: appointment.completedAt,
        };

        this.client.emit('appointment_updated', payload);
    }
}
