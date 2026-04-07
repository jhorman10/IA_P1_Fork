import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConsultationPolicy } from "src/domain/policies/consultation.policy";
import { NestLoggerAdapter } from "../../infrastructure/logging/nest-logger.adapter";
import { SystemClockAdapter } from "../../infrastructure/utils/system-clock.adapter";

import { AssignAvailableOfficesUseCaseImpl } from "../../application/use-cases/assign-available-offices.use-case.impl";
import { CancelAppointmentUseCaseImpl } from "../../application/use-cases/cancel-appointment.use-case.impl";
import { CompleteAppointmentUseCaseImpl } from "../../application/use-cases/complete-appointment.use-case.impl";
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
    // Provide a local LoggerPort here so use-cases can resolve logging without
    // depending on the composition root. This keeps the use-cases runnable
    // while the module graph stabilizes.
    {
      provide: "LoggerPort",
      useClass: NestLoggerAdapter,
    },
    {
      provide: "ClockPort",
      useClass: SystemClockAdapter,
    },
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
    // SPEC-012: Lifecycle use cases
    {
      provide: "CompleteAppointmentUseCase",
      inject: ["AppointmentRepository", "DoctorRepository", "LoggerPort"],
      useFactory: (repo, doctorRepo, logger) =>
        new CompleteAppointmentUseCaseImpl(repo, doctorRepo, logger),
    },
    {
      provide: "CancelAppointmentUseCase",
      inject: ["AppointmentRepository", "LoggerPort"],
      useFactory: (repo, logger) =>
        new CancelAppointmentUseCaseImpl(repo, logger),
    },
  ],
  exports: [
    "RegisterAppointmentUseCase",
    "CompleteExpiredAppointmentsUseCase",
    "AssignAvailableOfficesUseCase",
    "MaintenanceOrchestratorUseCase",
    "CompleteAppointmentUseCase",
    "CancelAppointmentUseCase",
  ],
})
export class UseCasesModule {}
