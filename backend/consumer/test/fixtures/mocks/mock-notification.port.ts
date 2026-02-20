import { NotificationPort } from "../../../src/domain/ports/outbound/notification.port";
import { Appointment } from "../../../src/domain/entities/appointment.entity";

/**
 * MockNotificationPort: Tracks notification calls for testing.
 */
export class MockNotificationPort implements NotificationPort {
  notificationCalls: Appointment[] = [];
  throwOnNotify = false;

  async notifyAppointmentUpdated(appointment: Appointment): Promise<void> {
    if (this.throwOnNotify) {
      throw new Error("Notification failed");
    }
    this.notificationCalls.push(appointment);
  }

  getLastNotification(): Appointment | null {
    if (this.notificationCalls.length === 0) {
      return null;
    }
    return this.notificationCalls[this.notificationCalls.length - 1];
  }

  setThrowOnNotify(shouldThrow: boolean) {
    this.throwOnNotify = shouldThrow;
  }

  reset() {
    this.notificationCalls = [];
    this.throwOnNotify = false;
  }
}
