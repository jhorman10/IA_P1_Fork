import { Module } from "@nestjs/common";
import { MongooseModule, getModelToken } from "@nestjs/mongoose";

import { EventDispatchingAppointmentRepositoryDecorator } from "../../infrastructure/persistence/event-dispatching-appointment-repository.decorator";
import { MongooseAppointmentRepository } from "../../infrastructure/persistence/mongoose-appointment.repository";
import { MongooseLockRepository } from "../../infrastructure/persistence/mongoose-lock.repository";
import { MongooseDoctorRepository } from "../../infrastructure/persistence/mongoose-doctor.repository";
import {
  Appointment,
  AppointmentSchema,
} from "../../schemas/appointment.schema";
import { Doctor, DoctorSchema } from "../../schemas/doctor.schema";
import { PoliciesModule } from "../policies/policies.module";
import { NestLoggerAdapter } from "../../infrastructure/logging/nest-logger.adapter";
import { ConsultationPolicy } from "../../domain/policies/consultation.policy";

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
    ]),
    PoliciesModule, // ⚕️ HUMAN CHECK - Repositories depend on domain policies
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
    // Provide a lightweight no-op DomainEventBus so the repositories can be
    // instantiated without requiring the full event-bus wiring. AppointmentModule
    // may override or provide a richer implementation when available.
    {
      provide: "DomainEventBus",
      useValue: {
        publish: async () => undefined,
      },
    },
    {
      provide: "AppointmentRepository",
      inject: ["MongooseAppointmentRepository", "DomainEventBus"],
      useFactory: (inner, bus) =>
        new EventDispatchingAppointmentRepositoryDecorator(inner, bus),
    },
    // Doctor repository (Mongoose adapter)
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
  ],
  exports: ["AppointmentRepository", "LockRepository", "DoctorRepository"],
})
export class RepositoriesModule {}
