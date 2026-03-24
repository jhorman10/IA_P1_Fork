export interface MaintenanceOrchestratorUseCase {
  /**
   * Executes a full maintenance cycle:
   * 1. Completes expired appointments.
   * 2. Categorizes waiting patients.
   * 3. Assigns available offices.
   */
  execute(): Promise<void>;
}
