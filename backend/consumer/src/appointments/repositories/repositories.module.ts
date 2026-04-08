import { Module } from "@nestjs/common";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";

import {
  AppointmentAssignedHandler,
  AppointmentRegisteredHandler,
} from "../../application/event-handlers/appointment-events.handler";
import { AutoAssignOnRegisterHandler } from "../../application/event-handlers/auto-assign.handler";
import { ConsultationPolicy } from "../../domain/policies/consultation.policy";
import { NestLoggerAdapter } from "../../infrastructure/logging/nest-logger.adapter";
import { LocalDomainEventBusAdapter } from "../../infrastructure/messaging/local-domain-event-bus.adapter";
import { EventDispatchingAppointmentRepositoryDecorator } from "../../infrastructure/persistence/event-dispatching-appointment-repository.decorator";
import { MongooseAppointmentRepository } from "../../infrastructure/persistence/mongoose-appointment.repository";
import { MongooseAuditAdapter } from "../../infrastructure/persistence/mongoose-audit.adapter";
import { MongooseDoctorRepository } from "../../infrastructure/persistence/mongoose-doctor.repository";
import { MongooseLockRepository } from "../../infrastructure/persistence/mongoose-lock.repository";
import {
  Appointment,
  AppointmentSchema,
} from "../../schemas/appointment.schema";
import { AuditLog, AuditLogSchema } from "../../schemas/audit-log.schema";
import { Doctor, DoctorSchema } from "../../schemas/doctor.schema";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { PoliciesModule } from "../policies/policies.module";

/**
 * @description RepositoriesModule encapsulates all data persistence mechanisms.
 *
 * @justification Repository pattern abstracts persistence details from business logic:
 * - MongoDB/Mongoose implementation can be swapped (DIP - Dependency Inversion)
 * - Supports testing with fake repositories
 * - Centralizes query logic and schema mapping
 *
 * @tradeoff vs direct ORM in use cases:
 *   ✅ Clean architecture (Infrastructure isolated from Domain)
 *   ✅ Testeable repositories via mocking
 *   ✅ Database technology agnostic
 *   ❌ Mapping overhead (Entity ← → Document)
 *   ❌ Extra indirection layer
 *
 * @submodules
 *   - MongooseAppointmentRepository: Read/write appointments
 *   - MongooseLockRepository: Distributed locking for maintenance tasks
 *   - EventDispatchingAppointmentRepositoryDecorator: Automatic event publishing
 *
 * @relatedPatterns Repository, Adapter, Decorator
 * @seeAlso ADR-001 (Hexagonal Architecture), SOLID (DIP), RULES.md
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Doctor.name, schema: DoctorSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    PoliciesModule, // ⚕️ HUMAN CHECK - Repositories depend on domain policies
    InfrastructureModule, // provides LoggerPort and DomainEventBus
  ],
  providers: [
    // Compatibility aliases: some modules reference the legacy provider tokens
    // (e.g. "default_MongooseModel_Appointment") — expose them by mapping
    // to the tokens created by MongooseModule.getModelToken.
    {
      provide: "default_MongooseModel_Appointment",
      inject: [getModelToken(Appointment.name)],
      useFactory: (model) => model,
    },
    {
      provide: "default_MongooseModel_Doctor",
      inject: [getModelToken(Doctor.name)],
      useFactory: (model) => model,
    },
    // ⚕️ HUMAN CHECK - Two-step factory:
    // 1. Create inner repository (pure Mongoose adapter)
    // 2. Wrap with event-dispatching decorator (cross-cutting concern)
    {
      provide: "MongooseAppointmentRepository",
      inject: [
        getModelToken(Appointment.name),
        ConsultationPolicy,
        "LoggerPort",
      ],
      useFactory: (model, policy, logger) =>
        new MongooseAppointmentRepository(model, policy, logger),
    },
    // Provide a local LoggerPort so repositories can log without depending on the
    // higher-level AppointmentModule. This keeps the RepositoriesModule
    // self-contained for DI and avoids circular imports.
    {
      provide: "LoggerPort",
      useClass: NestLoggerAdapter,
    },
    // Event handlers wired to the DomainEventBus used by the repository decorator.
    // NotificationPort and ClockPort are exported by InfrastructureModule (imported above).
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
    // AutoAssignOnRegisterHandler uses the inner MongooseAppointmentRepository
    // (not the decorated one) to avoid a construction-time circular dependency:
    //   DomainEventBus → AutoAssignHandler → AppointmentRepository(decorator) → DomainEventBus
    {
      provide: AutoAssignOnRegisterHandler,
      inject: [
        "MongooseAppointmentRepository",
        "DoctorRepository",
        "LoggerPort",
        "ClockPort",
        ConsultationPolicy,
        "NotificationPort",
      ],
      useFactory: (repo, doctorRepo, logger, clock, policy, notificationPort) =>
        new AutoAssignOnRegisterHandler(
          repo,
          doctorRepo,
          logger,
          clock,
          policy,
          notificationPort,
        ),
    },
    // Real DomainEventBus replacing the previous no-op.
    // The decorator uses this bus to dispatch domain events after each save.
    {
      provide: "DomainEventBus",
      inject: [
        AppointmentRegisteredHandler,
        AppointmentAssignedHandler,
        AutoAssignOnRegisterHandler,
      ],
      useFactory: (registered, assigned, autoAssign) =>
        new LocalDomainEventBusAdapter([registered, assigned, autoAssign]),
    },
    {
      provide: "AppointmentRepository",
      inject: ["MongooseAppointmentRepository", "DomainEventBus"],
      useFactory: (inner, bus) =>
        new EventDispatchingAppointmentRepositoryDecorator(inner, bus),
    },
    // SPEC-003: Doctor repository (read + status updates)
    {
      provide: "MongooseDoctorRepository",
      inject: [getModelToken(Doctor.name)],
      useFactory: (model) => new MongooseDoctorRepository(model),
    },
    {
      provide: "DoctorRepository",
      inject: ["MongooseDoctorRepository"],
      useFactory: (inner) => inner,
    },
    {
      provide: "LockRepository",
      useClass: MongooseLockRepository,
    },
    // SPEC-003: Audit log adapter (write-only)
    {
      provide: "AuditPort",
      useClass: MongooseAuditAdapter,
    },
  ],
  exports: [
    "AppointmentRepository",
    "LockRepository",
    "DoctorRepository",
    "AuditPort",
    "LoggerPort",
  ],
})
export class RepositoriesModule {}
