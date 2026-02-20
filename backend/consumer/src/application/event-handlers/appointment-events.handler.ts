import { Inject, Injectable, Logger } from "@nestjs/common";

import { AppointmentAssignedEvent } from "../../domain/events/appointment-assigned.event";
import { AppointmentRegisteredEvent } from "../../domain/events/appointment-registered.event";
import { DomainEventHandler } from "../../domain/ports/outbound/domain-event-handler.port";
import { NotificationPort } from "../../domain/ports/outbound/notification.port";

/**
 * Handler: Reacts to AppointmentRegistered events.
 * ⚕️ HUMAN CHECK - OCP: Un handler por tipo de evento. Sin cadenas instanceof.
 */
@Injectable()
export class AppointmentRegisteredHandler implements DomainEventHandler<AppointmentRegisteredEvent> {
  private readonly logger = new Logger(AppointmentRegisteredHandler.name);
  readonly eventType = AppointmentRegisteredEvent.name;

  constructor(
    @Inject("NotificationPort")
    private readonly notificationPort: NotificationPort,
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
@Injectable()
export class AppointmentAssignedHandler implements DomainEventHandler<AppointmentAssignedEvent> {
  private readonly logger = new Logger(AppointmentAssignedHandler.name);
  readonly eventType = AppointmentAssignedEvent.name;

  constructor(
    @Inject("NotificationPort")
    private readonly notificationPort: NotificationPort,
  ) {}

  async handle(event: AppointmentAssignedEvent): Promise<void> {
    this.logger.log(
      `Handling AppointmentAssignedEvent for ${event.appointment.idCard.toValue()}`,
    );
    await this.notificationPort.notifyAppointmentUpdated(event.appointment);
  }
}
