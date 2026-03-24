import { AppointmentAssignedEvent } from "../../domain/events/appointment-assigned.event";
import { AppointmentRegisteredEvent } from "../../domain/events/appointment-registered.event";
import { DomainEventHandler } from "../../domain/ports/outbound/domain-event-handler.port";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";

/**
 * Handler: Reacts to AppointmentRegistered events.
 * ⚕️ HUMAN CHECK - OCP: Un handler por tipo de evento. Sin cadenas instanceof.
 * DIP: Independiente del framework utilizando LoggerPort y NotificationPort.
 */
export class AppointmentRegisteredHandler implements DomainEventHandler<AppointmentRegisteredEvent> {
  readonly eventType = AppointmentRegisteredEvent.name;

  constructor(
    private readonly notificationPort: NotificationPort,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: AppointmentRegisteredEvent): Promise<void> {
    this.logger.log(
      `Handling AppointmentRegisteredEvent for ${event.appointment.idCard.toValue()}`,
    );
    await this.notificationPort.notifyAppointmentUpdated(event.appointment);
  }
}

/**
 * Handler: Reacts to AppointmentAssigned events.
 */
export class AppointmentAssignedHandler implements DomainEventHandler<AppointmentAssignedEvent> {
  readonly eventType = AppointmentAssignedEvent.name;

  constructor(
    private readonly notificationPort: NotificationPort,
    private readonly logger: LoggerPort,
  ) {}

  async handle(event: AppointmentAssignedEvent): Promise<void> {
    this.logger.log(
      `Handling AppointmentAssignedEvent for ${event.appointment.idCard.toValue()}`,
    );
    await this.notificationPort.notifyAppointmentUpdated(event.appointment);
  }
}
