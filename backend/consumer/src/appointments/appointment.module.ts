import { Module } from "@nestjs/common";

import {
  AppointmentAssignedHandler,
  AppointmentRegisteredHandler,
} from "../application/event-handlers/appointment-events.handler";
import { RmqNotificationAdapter } from "../infrastructure/adapters/rmq-notification.adapter";
import { NestLoggerAdapter } from "../infrastructure/logging/nest-logger.adapter";
import { LocalDomainEventBusAdapter } from "../infrastructure/messaging/local-domain-event-bus.adapter";
import { SystemClockAdapter } from "../infrastructure/utils/system-clock.adapter";
import { NotificationsModule } from "../notifications/notifications.module";
import { PoliciesModule } from "./policies/policies.module";
import { RepositoriesModule } from "./repositories/repositories.module";
import { UseCasesModule } from "./use-cases/use-cases.module";

/**
 * @description AppointmentModule is the orchestrator module for appointment management.
 *
 * @justification After refactoring into sub-modules (Policies, Repositories, UseCases),
 * the main AppointmentModule becomes a composition root that:
 * - Assembles sub-modules (SOLID: OCP - open for extension, closed for modification)
 * - Manages cross-cutting concerns (Event Bus, Handlers)
 * - Provides infrastructure adapters (Logger, Clock, Notification)
 * - Exports public API (use cases, repositories)
 *
 * @tradeoff vs monolithic module:
 *   ✅ SRP: Each sub-module has a single responsibility
 *   ✅ Testeable: Policies, Repositories, UseCases in isolation
 *   ✅ Maintainable: Changes localized to specific sub-module
 *   ✅ Reusable: Sub-modules can be composed differently
 *   ❌ More files to manage
 *   ❌ Requires clear dependency flow
 *
 * @architecture
 *   1. Imports: PoliciesModule, RepositoriesModule, UseCasesModule, NotificationsModule
 *   2. Provides: Event handlers, Event bus, Infrastructure adapters
 *   3. Exports: Public use cases and repositories
 *
 * @relatedPatterns Module Composition, Facade
 * @seeAlso ADR-001 (Hexagonal Architecture), docs/architecture/modules.md
 */
@Module({
  imports: [
    PoliciesModule,
    RepositoriesModule,
    UseCasesModule,
    NotificationsModule,
  ],
  providers: [
    // ⚕️ HUMAN CHECK - Infrastructure Adapters (Ports Implementation)
    // These are framework-aware implementations that bridge to domain ports
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

    // ⚕️ HUMAN CHECK - Event Handlers (Domain Event Subscribers)
    // SRP: Each handler reacts to one event type. OCP: New handlers without modifying existing.
    // Fixed R-03: Using Factory pattern instead of @Injectable decorator for framework agnosticism
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

    // ⚕️ HUMAN CHECK - DomainEventBus (Local In-Process Event Dispatcher)
    // H-25 Fix: Automatic event dispatch after repository save.
    // Alternative: External message broker (RabbitMQ) for true event-driven architecture.
    {
      provide: "DomainEventBus",
      inject: [AppointmentRegisteredHandler, AppointmentAssignedHandler],
      useFactory: (registered, assigned) =>
        new LocalDomainEventBusAdapter([registered, assigned]),
    },
  ],
  exports: [
    // Public ports (use cases, repositories)
    "RegisterAppointmentUseCase",
    "CompleteExpiredAppointmentsUseCase",
    "AssignAvailableOfficesUseCase",
    "MaintenanceOrchestratorUseCase",
    "AppointmentRepository",
    "LockRepository",
    // Infrastructure adapters (for other modules)
    "LoggerPort",
    "ClockPort",
    "NotificationPort",
    "DomainEventBus",
  ],
})
export class AppointmentModule {}
