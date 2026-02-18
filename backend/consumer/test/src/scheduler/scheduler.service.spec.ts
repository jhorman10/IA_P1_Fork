import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

describe('SchedulerService', () => {
    let service: SchedulerService;
    let mockCompleteUseCase: any;
    let mockAssignUseCase: any;

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config: Record<string, string> = {
                SCHEDULER_INTERVAL_MS: '15000',
            };
            return config[key];
        }),
    };

    const mockSchedulerRegistry = {
        addInterval: jest.fn(),
    };

    beforeEach(async () => {
        mockCompleteUseCase = { execute: jest.fn() };
        mockAssignUseCase = { execute: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: 'CompleteExpiredAppointmentsUseCase', useValue: mockCompleteUseCase },
                { provide: 'AssignAvailableOfficesUseCase', useValue: mockAssignUseCase },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
            ],
        }).compile();

        service = module.get<SchedulerService>(SchedulerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleSchedulerTick', () => {
        it('should execute both use cases sequentially', async () => {
            await service.handleSchedulerTick();
            expect(mockCompleteUseCase.execute).toHaveBeenCalled();
            expect(mockAssignUseCase.execute).toHaveBeenCalled();
        });

        it('should log error if orchestration fails', async () => {
            mockCompleteUseCase.execute.mockRejectedValue(new Error('Cleanup Error'));

            await expect(service.handleSchedulerTick()).resolves.not.toThrow();
            expect(mockCompleteUseCase.execute).toHaveBeenCalled();
            // In this orchestration, if complete fails, assign shouldn't be called (simple sequential)
            expect(mockAssignUseCase.execute).not.toHaveBeenCalled();
        });
    });
});
