import { Inject,Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

import { Appointment } from "../../domain/entities/appointment.entity";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";

// Pattern: Adapter — Bridges RabbitMQ Client with the Domain Port
// ⚕️ HUMAN CHECK - DIP: Implementa el puerto de notificación usando NestJS ClientProxy

@Injectable()
export class RabbitMQNotificationAdapter implements NotificationPort {
  constructor(
    @Inject("APPOINTMENT_NOTIFICATIONS") private readonly client: ClientProxy,
  ) {}

  async notifyAppointmentUpdated(appointment: Appointment): Promise<void> {
    const payload = {
      id: appointment.id,
      fullName: appointment.fullName.toValue(),
      idCard: appointment.idCard.toValue(),
      office: appointment.office,
      status: appointment.status,
      priority: appointment.priority.toValue(),
      timestamp: appointment.timestamp,
      completedAt: appointment.completedAt,
    };

    this.client.emit("appointment_updated", payload);
  }
}
