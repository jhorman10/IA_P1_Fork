import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { TurnosService } from '../appointments/turnos.service';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

describe('SchedulerService', () => {
    let service: SchedulerService;
    let turnosService: TurnosService;

    const mockAppointmentsService = {
        completeCalledAppointments: jest.fn(),
        getOccupiedOffices: jest.fn(),
        findWaitingAppointments: jest.fn(),
        assignOffice: jest.fn(),
        toEventPayload: jest.fn(),
    };

    const mockNotificationsClient = {
        emit: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            const config: Record<string, string> = {
                SCHEDULER_INTERVAL_MS: '15000',
                CONSULTORIOS_TOTAL: '5',
            };
            return config[key];
        }),
    };

    const mockSchedulerRegistry = {
        addInterval: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: TurnosService, useValue: mockAppointmentsService },
                { provide: 'TURNOS_NOTIFICATIONS', useValue: mockNotificationsClient },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: SchedulerRegistry, useValue: mockSchedulerRegistry },
            ],
        }).compile();

        service = module.get<SchedulerService>(SchedulerService);
        turnosService = module.get<TurnosService>(TurnosService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('handleSchedulerTick', () => {
        it('should assign an office if there are waiting patients and free offices', async () => {
            // Setup
            mockAppointmentsService.completeCalledAppointments.mockResolvedValue([]);
            mockAppointmentsService.getOccupiedOffices.mockResolvedValue(['1', '2']); // 5 total, 3 free
            mockAppointmentsService.findWaitingAppointments.mockResolvedValue([{ _id: 'appointment1', fullName: 'Test' }]);
            mockAppointmentsService.assignOffice.mockResolvedValue({
                _id: 'appointment1',
                fullName: 'Test',
                office: '3',
            });

            // Execute
            await service.handleSchedulerTick();

            // Verify
            expect(mockAppointmentsService.assignOffice).toHaveBeenCalledWith('appointment1', '3');
            expect(mockNotificationsClient.emit).toHaveBeenCalledWith('appointment_updated', expect.anything());
        });

        it('should do nothing if no offices are free', async () => {
            // Setup
            mockAppointmentsService.completeCalledAppointments.mockResolvedValue([]);
            mockAppointmentsService.getOccupiedOffices.mockResolvedValue(['1', '2', '3', '4', '5']); // All 5 occupied

            // Execute
            await service.handleSchedulerTick();

            // Verify
            expect(mockAppointmentsService.findWaitingAppointments).not.toHaveBeenCalled();
            expect(mockAppointmentsService.assignOffice).not.toHaveBeenCalled();
        });
    });
});
