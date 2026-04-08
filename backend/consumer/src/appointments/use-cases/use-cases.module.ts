import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

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
  providers: [],
  exports: [],
})
export class UseCasesModule {}
