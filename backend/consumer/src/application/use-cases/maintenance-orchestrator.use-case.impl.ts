import { MaintenanceOrchestratorUseCase } from '../../domain/ports/inbound/maintenance-orchestrator.use-case';
import { CompleteExpiredAppointmentsUseCase } from '../../domain/ports/inbound/complete-expired-appointments.use-case';
import { AssignAvailableOfficesUseCase } from '../../domain/ports/inbound/assign-available-offices.use-case';
import { LoggerPort } from '../../domain/ports/outbound/logger.port';

export class MaintenanceOrchestratorUseCaseImpl implements MaintenanceOrchestratorUseCase {
    constructor(
        private readonly completeUseCase: CompleteExpiredAppointmentsUseCase,
        private readonly assignUseCase: AssignAvailableOfficesUseCase,
        private readonly logger: LoggerPort,
    ) { }

    async execute(): Promise<void> {
        try {
            this.logger.log('Starting maintenance cycle...', 'MaintenanceOrchestrator');

            // 1. First, complete what's done (clean up expired slots)
            await this.completeUseCase.execute();

            // 2. Then, assign what's free (matching waiting patients)
            await this.assignUseCase.execute();

            this.logger.log('Maintenance cycle completed successfully.', 'MaintenanceOrchestrator');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error(`Maintenance cycle failed: ${message}`, 'MaintenanceOrchestrator');
            // ⚕️ HUMAN CHECK: Depending on the severity, we might want to rethrow or emit a domain event here.
            // For now, we log and allow the next tick to retry.
        }
    }
}
