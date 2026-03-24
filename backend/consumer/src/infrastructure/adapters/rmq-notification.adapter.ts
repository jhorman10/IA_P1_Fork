import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

import { Appointment } from "../../domain/entities/appointment.entity";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";
import { NotificationsService } from "../../notifications/notifications.service";
import { AppointmentNotificationPayload } from "./appointment-notification.payload";

@Injectable()
export class RmqNotificationAdapter implements NotificationPort {
  constructor(
    private readonly localNotifications: NotificationsService,
    @Inject("APPOINTMENT_NOTIFICATIONS")
    private readonly notificationsClient: ClientProxy,
  ) {}

  async notifyAppointmentUpdated(appointment: Appointment): Promise<void> {
    // 1. Local logging/notification
    await this.localNotifications.sendNotification(
      appointment.idCard.toValue(),
      appointment.office,
    );

    // 2. Global event/dashboard update via RMQ
    this.notificationsClient.emit(
      "appointment_created",
      this.mapToPayload(appointment),
    );
  }

  // ⚕️ HUMAN CHECK - H-03 Fix: Typed return instead of `any`
  private mapToPayload(
    appointment: Appointment,
  ): AppointmentNotificationPayload {
    return {
      id: appointment.id,
      fullName: appointment.fullName.toValue(),
      idCard: appointment.idCard.toValue(),
      office: appointment.office,
      status: appointment.status,
      priority: appointment.priority.toValue(),
      timestamp: appointment.timestamp,
      completedAt: appointment.completedAt,
    };
  }
}
