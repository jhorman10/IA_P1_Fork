import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

describe('SchedulerService', () => {
    let service: SchedulerService;
    interface MaintenanceUseCaseMock {
        execute: jest.Mock<void, []>;
    }
    interface SchedulerRegistryMock {
        addInterval: jest.Mock<void, [string, unknown]>;
    }
    let maintenanceUseCase: MaintenanceUseCaseMock;
    let schedulerRegistry: SchedulerRegistryMock;

    const mockMaintenanceUseCase = {
        execute: jest.fn(),
    };

    const mockLogger = {
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
            if (key === 'SCHEDULER_INTERVAL_MS') return '15000';
            return null;
        }),
    };

    const mockSchedulerRegistry = {
        addInterval: jest.fn(),
    };

    beforeEach(async () => {
        jest.useFakeTimers();
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
                { provide: 'MaintenanceOrchestratorUseCase', useValue: mockMaintenanceUseCase },
                { provide: 'LoggerPort', useValue: mockLogger },
            ],
        }).compile();

        service = module.get<SchedulerService>(SchedulerService);
        maintenanceUseCase = module.get('MaintenanceOrchestratorUseCase');
        schedulerRegistry = module.get(SchedulerRegistry);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should initialize interval onModuleInit', () => {
        service.onModuleInit();
        expect(mockSchedulerRegistry.addInterval).toHaveBeenCalledWith(
            'appointment-assignment-scheduler',
            expect.anything()
        );
    });

    it('should delegate maintenance logic on tick', async () => {
        await service.handleSchedulerTick();
        expect(maintenanceUseCase.execute).toHaveBeenCalled();
    });
});
