import { AssignAvailableOfficesUseCase } from "../../domain/ports/inbound/assign-available-offices.use-case";
import { CompleteExpiredAppointmentsUseCase } from "../../domain/ports/inbound/complete-expired-appointments.use-case";
import { MaintenanceOrchestratorUseCase } from "../../domain/ports/inbound/maintenance-orchestrator.use-case";
import { LockRepository } from "../../domain/ports/outbound/lock.repository";
import { LoggerPort } from "../../domain/ports/outbound/logger.port";

export class MaintenanceOrchestratorUseCaseImpl implements MaintenanceOrchestratorUseCase {
  private readonly LOCK_NAME = "maintenance_task_lock";
  private readonly LOCK_TTL = 30000; // 30 seconds

  constructor(
    private readonly completeUseCase: CompleteExpiredAppointmentsUseCase,
    private readonly assignUseCase: AssignAvailableOfficesUseCase,
    private readonly lockRepository: LockRepository,
    private readonly logger: LoggerPort,
  ) {}

  async execute(): Promise<void> {
    // ⚕️ HUMAN CHECK - H-20 Fix: Bloqueo distribuido para seguridad en concurrencia
    const acquired = await this.lockRepository.acquire(
      this.LOCK_NAME,
      this.LOCK_TTL,
    );
    if (!acquired) {
      return; // Another instance is already running
    }

    try {
      this.logger.log(
        "Starting maintenance cycle...",
        "MaintenanceOrchestrator",
      );

      // 1. First, complete what's done (clean up expired slots)
      await this.completeUseCase.execute();

      // 2. Then, assign what's free (matching waiting patients)
      await this.assignUseCase.execute();

      this.logger.log(
        "Maintenance cycle completed successfully.",
        "MaintenanceOrchestrator",
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Maintenance cycle failed: ${message}`,
        "MaintenanceOrchestrator",
      );
    } finally {
      await this.lockRepository.release(this.LOCK_NAME);
    }
  }
}
