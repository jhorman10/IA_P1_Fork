import { Module } from '@nestjs/common';
import { ConsultationPolicy } from '../../domain/policies/consultation.policy';

/**
 * @description PoliciesModule encapsulates domain policies that enforce business rules.
 *
 * @justification Policy objects separate validation/business logic from repositories
 * and use cases, following the Single Responsibility Principle (SRP).
 * This module groups all policies for:
 * - Appointment consultation rules (office availability, capacity)
 * - Potential future policies (OfficeHourPolicy, CapacityPolicy, etc.)
 *
 * @tradeoff vs inline logic:
 *   ✅ Reusable across multiple use cases
 *   ✅ Testeable in isolation (pure domain logic)
 *   ✅ Clear separation of concerns
 *   ❌ Slight indirection (class instantiation)
 *
 * @relatedPatterns Policy Pattern, DDD Domain Service
 * @seeAlso ADR-001 (Domain-Driven Design), RULES.md
 */
@Module({
    providers: [
        // ⚕️ HUMAN CHECK - SOLID (SRP): Policy is pure domain logic
        // No @Injectable decorator needed in ConsultationPolicy itself (it's not framework-aware)
        // NestJS wraps it here for DI purposes
        {
            provide: ConsultationPolicy,
            useFactory: () => new ConsultationPolicy(),
        },
    ],
    exports: [ConsultationPolicy],
})
export class PoliciesModule {}
