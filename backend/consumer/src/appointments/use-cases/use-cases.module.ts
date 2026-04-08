import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ConsultationPolicy } from "src/domain/policies/consultation.policy";

import { AssignDoctorUseCaseImpl } from "../../application/use-cases/assign-doctor.use-case.impl";
import { CancelAppointmentUseCaseImpl } from "../../application/use-cases/cancel-appointment.use-case.impl";
import { CompleteAppointmentUseCaseImpl } from "../../application/use-cases/complete-appointment.use-case.impl";
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
 * - AssignAvailableOfficesUseCase: Assign waiting patients to available doctors (SPEC-003)
 * - CancelAppointmentUseCase: Cancel a waiting appointment (SPEC-012)
 * - CompleteAppointmentUseCase: Complete a called appointment (SPEC-012)
 * - MaintenanceOrchestratorUseCase: Coordinate maintenance tasks with locking
 *
 * @tradeoff vs thin services:
 *   ✅ Clear orchestration logic (not mixed with HTTP/db concerns)
 *   ✅ Reusable from multiple controllers
 *   ✅ Testeable without HTTP context
 *   ✅ SOLID: SRP (one reason to change = business rule change)
 *   ❌ Requires proper dependency injection setup
 *
 * @dependencies
 *   - RepositoriesModule: Provides AppointmentRepository, LockRepository, DoctorRepository
 *   - PoliciesModule: Provides ConsultationPolicy for business rule enforcement
 *   - ConfigService: Parametrizes TOTAL_OFFICES from environment
 *
 * @relatedPatterns UseCase, Command, Application Service, Orchestrator
 * @seeAlso ADR-001 (Hexagonal Architecture), SOLID (SRP, DIP)
 */
@Module({
  imports: [
    ConfigModule, // ⚕️ HUMAN CHECK - TOTAL_OFFICES parametrization
    RepositoriesModule,
    PoliciesModule,
    InfrastructureModule, // provides LoggerPort, ClockPort, NotificationPort, DomainEventBus
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
        "AuditPort",
      ],
      useFactory: (repo, notification, logger, clock, doctorRepo, auditPort) =>
        new CompleteExpiredAppointmentsUseCaseImpl(
          repo,
          notification,
          logger,
          clock,
          doctorRepo,
          auditPort,
        ),
    },
    {
      provide: "AssignAvailableOfficesUseCase",
      inject: [
        "AppointmentRepository",
        "DoctorRepository",
        "AuditPort",
        "LoggerPort",
        "ClockPort",
        ConsultationPolicy,
      ],
      useFactory: (
        repo,
        doctorRepo,
        auditPort,
        logger,
        clock,
        policy: ConsultationPolicy,
      ) =>
        new AssignDoctorUseCaseImpl(
          repo,
          doctorRepo,
          auditPort,
          logger,
          clock,
          policy,
        ),
    },
    // SPEC-012: Individual appointment lifecycle use cases
    {
      provide: "CancelAppointmentUseCase",
      inject: ["AppointmentRepository", "LoggerPort", "NotificationPort"],
      useFactory: (repo, logger, notification) =>
        new CancelAppointmentUseCaseImpl(repo, logger, notification),
    },
    {
      provide: "CompleteAppointmentUseCase",
      inject: [
        "AppointmentRepository",
        "DoctorRepository",
        "LoggerPort",
        "NotificationPort",
      ],
      useFactory: (repo, doctorRepo, logger, notification) =>
        new CompleteAppointmentUseCaseImpl(
          repo,
          doctorRepo,
          logger,
          notification,
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
    "CancelAppointmentUseCase",
    "CompleteAppointmentUseCase",
    "MaintenanceOrchestratorUseCase",
  ],
})
export class UseCasesModule {}
