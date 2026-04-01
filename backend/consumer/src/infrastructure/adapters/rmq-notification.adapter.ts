import { Inject, Injectable, Logger } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { lastValueFrom } from "rxjs";
import { retry, timeout } from "rxjs/operators";

import { Appointment } from "../../domain/entities/appointment.entity";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";
import { NotificationsService } from "../../notifications/notifications.service";
import { AppointmentNotificationPayload } from "./appointment-notification.payload";

@Injectable()
export class RmqNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger(RmqNotificationAdapter.name);

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

    // 2. Global event/dashboard update via RMQ — awaited with retry for reliability
    await lastValueFrom(
      this.notificationsClient
        .emit("appointment_created", this.mapToPayload(appointment))
        .pipe(timeout(5000), retry({ count: 3, delay: 1000 })),
    ).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to emit appointment_created after retries: ${msg}`,
      );
      throw err;
    });
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
      // SPEC-003: preserve assigned-doctor context
      doctorId: appointment.doctorId ?? null,
      doctorName: appointment.doctorName ?? null,
    };
  }
}
