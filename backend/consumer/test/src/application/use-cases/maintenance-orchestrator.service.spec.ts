import { MaintenanceOrchestratorUseCaseImpl } from "../../../../src/application/use-cases/maintenance-orchestrator.use-case.impl";

describe("MaintenanceOrchestratorUseCaseImpl", () => {
  let orchestrator: MaintenanceOrchestratorUseCaseImpl;
  interface UseCaseMock {
    execute: jest.Mock<Promise<void>, []>;
  }
  interface LockRepositoryMock {
    acquire: jest.Mock<Promise<boolean>, []>;
    release: jest.Mock<Promise<void>, []>;
  }
  // Mock completo de LoggerPort
  interface LoggerMock {
    log: jest.Mock<void, [string, string?]>;
    error: jest.Mock<void, [string, string?, string?]>;
    warn: jest.Mock<void, [string, string?]>;
    debug: jest.Mock<void, [string, string?]>;
    verbose: jest.Mock<void, [string, string?]>;
  }
  let mockCompleteUseCase: UseCaseMock;
  let mockAssignUseCase: UseCaseMock;
  let mockLockRepository: LockRepositoryMock;
  let mockLogger: LoggerMock;

  beforeEach(() => {
    mockCompleteUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    mockAssignUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    mockLockRepository = {
      acquire: jest.fn().mockResolvedValue(true),
      release: jest.fn().mockResolvedValue(undefined),
    };
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    orchestrator = new MaintenanceOrchestratorUseCaseImpl(
      mockCompleteUseCase,
      mockAssignUseCase,
      mockLockRepository,
      mockLogger,
    );
  });

  it("should execute cleanup and then assignment sequentially", async () => {
    await orchestrator.execute();

    expect(mockCompleteUseCase.execute).toHaveBeenCalled();
    expect(mockAssignUseCase.execute).toHaveBeenCalled();

    // Check order
    const completeOrder =
      mockCompleteUseCase.execute.mock.invocationCallOrder[0];
    const assignOrder = mockAssignUseCase.execute.mock.invocationCallOrder[0];
    expect(completeOrder).toBeLessThan(assignOrder);
  });

  it("should log success message", async () => {
    await orchestrator.execute();
    expect(mockLogger.log).toHaveBeenCalledWith(
      expect.stringContaining("completed successfully"),
      "MaintenanceOrchestrator",
    );
  });

  it("should log error and not throw if a use case fails", async () => {
    mockCompleteUseCase.execute.mockRejectedValue(new Error("Cleanup Failure"));

    await expect(orchestrator.execute()).resolves.toBeUndefined();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("Maintenance cycle failed: Cleanup Failure"),
      "MaintenanceOrchestrator",
    );
    // In this sequence, if complete fails, assign shouldn't be called
    expect(mockAssignUseCase.execute).not.toHaveBeenCalled();
  });
});
