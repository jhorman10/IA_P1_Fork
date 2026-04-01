import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ConsultationPolicy } from "src/domain/policies/consultation.policy";

import { AssignDoctorUseCaseImpl } from "../../application/use-cases/assign-doctor.use-case.impl";
import { CompleteExpiredAppointmentsUseCaseImpl } from "../../application/use-cases/complete-expired-appointments.use-case.impl";
import { MaintenanceOrchestratorUseCaseImpl } from "../../application/use-cases/maintenance-orchestrator.use-case.impl";
import { RegisterAppointmentUseCaseImpl } from "../../application/use-cases/register-appointment.use-case.impl";
import { InfrastructureModule } from "../infrastructure/infrastructure.module";
import { PoliciesModule } from "../policies/policies.module";
import { RepositoriesModule } from "../repositories/repositories.module";

/**
 * @description UseCasesModule encapsulates all business logic orchestration.
 *
 * @justification Use Cases (Application Services in DDD) separate business orchestration
 * from controllers, repositories, and domain entities. This module groups:
 * - RegisterAppointmentUseCase: Create new appointments
 * - CompleteExpiredAppointmentsUseCase: Mark expired appointments as done
 * - AssignAvailableOfficesUseCase: Assign waiting patients to free offices
 * - MaintenanceOrchestratorUseCase: Coordinate both maintenance tasks with locking
 *
 * @tradeoff vs thin services:
 *   ✅ Clear orchestration logic (not mixed with HTTP/db concerns)
 *   ✅ Reusable from multiple controllers
 *   ✅ Testeable without HTTP context
 *   ✅ SOLID: SRP (one reason to change = business rule change)
 *   ❌ Requires proper dependency injection setup
 *
 * @dependencies
 *   - RepositoriesModule: Provides AppointmentRepository, LockRepository
 *   - PoliciesModule: Provides ConsultationPolicy for business rule enforcement
 *
 * @relatedPatterns UseCase, Command, Application Service, Orchestrator
 * @seeAlso ADR-001 (Hexagonal Architecture), SOLID (SRP, DIP)
 */
@Module({
  imports: [
    ConfigModule,
    RepositoriesModule,
    PoliciesModule,
    InfrastructureModule,
  ],
  providers: [
    {
      provide: "RegisterAppointmentUseCase",
      inject: ["AppointmentRepository", "LoggerPort", "ClockPort"],
      useFactory: (repo, logger, clock) =>
        new RegisterAppointmentUseCaseImpl(repo, logger, clock),
    },
    {
      provide: "CompleteExpiredAppointmentsUseCase",
      inject: [
        "AppointmentRepository",
        "NotificationPort",
        "LoggerPort",
        "ClockPort",
        "DoctorRepository",
      ],
      useFactory: (repo, notification, logger, clock, doctorRepo) =>
        new CompleteExpiredAppointmentsUseCaseImpl(
          repo,
          notification,
          logger,
          clock,
          doctorRepo,
        ),
    },
    {
      provide: "AssignAvailableOfficesUseCase",
      inject: [
        "AppointmentRepository",
        "DoctorRepository",
        "LoggerPort",
        "ClockPort",
        ConsultationPolicy,
      ],
      useFactory: (
        repo,
        doctorRepo,
        logger,
        clock,
        policy: ConsultationPolicy,
      ) =>
        new AssignDoctorUseCaseImpl(
          repo,
          doctorRepo,
          logger,
          clock,
          policy,
        ),
    },
    {
      provide: "MaintenanceOrchestratorUseCase",
      inject: [
        "AssignAvailableOfficesUseCase",
        "CompleteExpiredAppointmentsUseCase",
        "LockRepository",
        "LoggerPort",
      ],
      useFactory: (assign, complete, lock, logger) =>
        new MaintenanceOrchestratorUseCaseImpl(assign, complete, lock, logger),
    },
  ],
  exports: [
    "RegisterAppointmentUseCase",
    "CompleteExpiredAppointmentsUseCase",
    "AssignAvailableOfficesUseCase",
    "MaintenanceOrchestratorUseCase",
  ],
})
export class UseCasesModule {}
