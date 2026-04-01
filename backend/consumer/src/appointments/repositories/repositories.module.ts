import { Module } from "@nestjs/common";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";

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
import { ConsultationPolicy } from "../../domain/policies/consultation.policy";
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
    {
      provide: "AppointmentRepository",
      inject: ["MongooseAppointmentRepository", "DomainEventBus"],
      useFactory: (inner, bus) =>
        new EventDispatchingAppointmentRepositoryDecorator(inner, bus),
    },
    {
      provide: "LockRepository",
      useClass: MongooseLockRepository,
    },
    // SPEC-003: Doctor repository (read + status updates)
    {
      provide: "DoctorRepository",
      useClass: MongooseDoctorRepository,
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
  ],
})
export class RepositoriesModule {}
