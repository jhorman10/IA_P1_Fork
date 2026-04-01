import { Module } from "@nestjs/common";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";

import { EventDispatchingAppointmentRepositoryDecorator } from "../../infrastructure/persistence/event-dispatching-appointment-repository.decorator";
import { MongooseAppointmentRepository } from "../../infrastructure/persistence/mongoose-appointment.repository";
import { MongooseDoctorRepository } from "../../infrastructure/persistence/mongoose-doctor.repository";
import { MongooseLockRepository } from "../../infrastructure/persistence/mongoose-lock.repository";
import {
  Appointment,
  AppointmentSchema,
} from "../../schemas/appointment.schema";
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
    ]),
    PoliciesModule,
    InfrastructureModule,
  ],
  providers: [
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
    {
      provide: "DoctorRepository",
      useClass: MongooseDoctorRepository,
    },
  ],
  exports: ["AppointmentRepository", "LockRepository", "DoctorRepository"],
})
export class RepositoriesModule {}
