import { Module } from "@nestjs/common";

import {
  AppointmentAssignedHandler,
  AppointmentRegisteredHandler,
} from "../../application/event-handlers/appointment-events.handler";
import { RmqNotificationAdapter } from "../../infrastructure/adapters/rmq-notification.adapter";
import { NestLoggerAdapter } from "../../infrastructure/logging/nest-logger.adapter";
import { LocalDomainEventBusAdapter } from "../../infrastructure/messaging/local-domain-event-bus.adapter";
import { SystemClockAdapter } from "../../infrastructure/utils/system-clock.adapter";
import { NotificationsModule } from "../../notifications/notifications.module";

/**
 * InfrastructureModule — cross-cutting infrastructure adapters shared by sub-modules.
 *
 * Provides: LoggerPort, ClockPort, NotificationPort, DomainEventBus (+ its handlers).
 * Imported by: RepositoriesModule, UseCasesModule, AppointmentModule.
 * Re-exported by: AppointmentModule so consumers further up the tree can inject these ports.
 */
@Module({
  imports: [NotificationsModule],
  providers: [
    {
      provide: "LoggerPort",
      useClass: NestLoggerAdapter,
    },
    {
      provide: "ClockPort",
      useClass: SystemClockAdapter,
    },
    {
      provide: "NotificationPort",
      useClass: RmqNotificationAdapter,
    },
    {
      provide: AppointmentRegisteredHandler,
      inject: ["NotificationPort", "LoggerPort"],
      useFactory: (notificationPort, loggerPort) =>
        new AppointmentRegisteredHandler(notificationPort, loggerPort),
    },
    {
      provide: AppointmentAssignedHandler,
      inject: ["NotificationPort", "LoggerPort"],
      useFactory: (notificationPort, loggerPort) =>
        new AppointmentAssignedHandler(notificationPort, loggerPort),
    },
    {
      provide: "DomainEventBus",
      inject: [AppointmentRegisteredHandler, AppointmentAssignedHandler],
      useFactory: (registered, assigned) =>
        new LocalDomainEventBusAdapter([registered, assigned]),
    },
  ],
  exports: ["LoggerPort", "ClockPort", "NotificationPort", "DomainEventBus"],
})
export class InfrastructureModule {}
