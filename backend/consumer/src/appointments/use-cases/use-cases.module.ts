import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConsultationPolicy } from "src/domain/policies/consultation.policy";

import { AssignAvailableOfficesUseCaseImpl } from "../../application/use-cases/assign-available-offices.use-case.impl";
import { CompleteExpiredAppointmentsUseCaseImpl } from "../../application/use-cases/complete-expired-appointments.use-case.impl";
import { MaintenanceOrchestratorUseCaseImpl } from "../../application/use-cases/maintenance-orchestrator.use-case.impl";
import { RegisterAppointmentUseCaseImpl } from "../../application/use-cases/register-appointment.use-case.impl";
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
      ],
      useFactory: (repo, notification, logger, clock) =>
        new CompleteExpiredAppointmentsUseCaseImpl(
          repo,
          notification,
          logger,
          clock,
        ),
    },
    {
      provide: "AssignAvailableOfficesUseCase",
      inject: [
        "AppointmentRepository",
        "LoggerPort",
        "ClockPort",
        "ConsultationPolicy",
        ConfigService,
      ],
      useFactory: (
        repo,
        logger,
        clock,
        policy: ConsultationPolicy,
        configService: ConfigService,
      ) => {
        const totalOffices = configService.get<number>("TOTAL_OFFICES", 5);
        return new AssignAvailableOfficesUseCaseImpl(
          repo,
          logger,
          clock,
          totalOffices,
          policy,
        );
      },
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
