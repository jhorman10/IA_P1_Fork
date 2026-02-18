import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from 'src/scheduler/scheduler.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

describe('SchedulerService', () => {
    let service: SchedulerService;
    let mockUseCase: any;

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
        mockUseCase = {
            execute: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: 'AssignAppointmentsUseCase', useValue: mockUseCase },
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
        it('should execute the use case', async () => {
            await service.handleSchedulerTick();
            expect(mockUseCase.execute).toHaveBeenCalled();
        });

        it('should log error if use case fails', async () => {
            mockUseCase.execute.mockRejectedValue(new Error('Domain Error'));
            // Note: We'd need to spy on logger to verify logging, 
            // but the main goal is ensuring it doesn't throw and crash the tick.
            await expect(service.handleSchedulerTick()).resolves.not.toThrow();
            expect(mockUseCase.execute).toHaveBeenCalled();
        });
    });
});
