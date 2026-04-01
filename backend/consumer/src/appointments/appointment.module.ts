import { Module } from "@nestjs/common";

import { NotificationsModule } from "../notifications/notifications.module";
import { InfrastructureModule } from "./infrastructure/infrastructure.module";
import { PoliciesModule } from "./policies/policies.module";
import { RepositoriesModule } from "./repositories/repositories.module";
import { UseCasesModule } from "./use-cases/use-cases.module";

/**
 * @description AppointmentModule is the orchestrator module for appointment management.
 *
 * @justification After refactoring into sub-modules (Policies, Repositories, UseCases),
 * the main AppointmentModule becomes a composition root that:
 * - Assembles sub-modules (SOLID: OCP - open for extension, closed for modification)
 * - Manages cross-cutting concerns (Event Bus, Handlers)
 * - Provides infrastructure adapters (Logger, Clock, Notification)
 * - Exports public API (use cases, repositories)
 *
 * @tradeoff vs monolithic module:
 *   ✅ SRP: Each sub-module has a single responsibility
 *   ✅ Testeable: Policies, Repositories, UseCases in isolation
 *   ✅ Maintainable: Changes localized to specific sub-module
 *   ✅ Reusable: Sub-modules can be composed differently
 *   ❌ More files to manage
 *   ❌ Requires clear dependency flow
 *
 * @architecture
 *   1. Imports: PoliciesModule, RepositoriesModule, UseCasesModule, NotificationsModule
 *   2. Provides: Event handlers, Event bus, Infrastructure adapters
 *   3. Exports: Public use cases and repositories
 *
 * @relatedPatterns Module Composition, Facade
 * @seeAlso ADR-001 (Hexagonal Architecture), docs/architecture/modules.md
 */
@Module({
  imports: [
    PoliciesModule,
    RepositoriesModule,
    UseCasesModule,
    NotificationsModule,
    InfrastructureModule,
  ],
  // Re-export sub-modules so consumers of AppointmentModule can inject their providers
  exports: [UseCasesModule, RepositoriesModule, InfrastructureModule],
})
export class AppointmentModule {}
