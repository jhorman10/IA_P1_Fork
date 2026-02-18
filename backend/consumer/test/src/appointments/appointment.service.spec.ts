import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from 'src/appointments/appointment.service';
import { Appointment } from 'src/domain/entities/appointment.entity';
import { IdCard } from 'src/domain/value-objects/id-card.value-object';
import { FullName } from 'src/domain/value-objects/full-name.value-object';
import { Priority } from 'src/domain/value-objects/priority.value-object';
import { PersistenceAppointmentData } from 'src/infrastructure/persistence/persistence-appointment.interface';

/**
 * ⚕️ HUMAN CHECK - Consumer AppointmentService Facade.
 * Verifies typed returns and error propagation.
 */
describe('AppointmentService (Consumer Facade)', () => {
    let service: AppointmentService;
    let mockRegisterUseCase: any;
    let mockRepo: any;
    let mockLogger: any;

    const dummyAppointment = new Appointment(
        'mockId',
        new IdCard(12345678),
        new FullName('John Doe'),
        new Priority('medium'),
        'waiting'
    );

    beforeEach(async () => {
        mockRegisterUseCase = {
            execute: jest.fn().mockResolvedValue(dummyAppointment),
        };
        mockRepo = {
            findWaiting: jest.fn().mockResolvedValue([]),
            getOccupiedOfficeIds: jest.fn().mockResolvedValue([]),
        };
        mockLogger = {
            log: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppointmentService,
                {
                    provide: 'RegisterAppointmentUseCase',
                    useValue: mockRegisterUseCase,
                },
                {
                    provide: 'AppointmentRepository',
                    useValue: mockRepo,
                },
                {
                    provide: 'LoggerPort',
                    useValue: mockLogger,
                },
            ],
        }).compile();

        service = module.get<AppointmentService>(AppointmentService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAppointment', () => {
        it('should delegate to RegisterAppointmentUseCase and return typed data', async () => {
            const dto = { idCard: 12345678, fullName: 'John Doe' };
            const result: PersistenceAppointmentData = await service.createAppointment(dto as any);

            expect(mockRegisterUseCase.execute).toHaveBeenCalled();
            expect(result.idCard).toBe(12345678);
            expect(result.fullName).toBe('John Doe');
            expect(result.status).toBe('waiting');
        });

        it('should propagate error from RegisterAppointmentUseCase', async () => {
            mockRegisterUseCase.execute.mockRejectedValue(new Error('Registration failed'));

            const dto = { idCard: 12345678, fullName: 'John Doe' };
            await expect(service.createAppointment(dto as any)).rejects.toThrow('Registration failed');
        });
    });

    describe('findWaitingAppointments', () => {
        it('should delegate to AppointmentRepository', async () => {
            await service.findWaitingAppointments();
            expect(mockRepo.findWaiting).toHaveBeenCalled();
        });

        it('should return mapped persistence data with proper types', async () => {
            mockRepo.findWaiting.mockResolvedValue([dummyAppointment]);

            const result: PersistenceAppointmentData[] = await service.findWaitingAppointments();

            expect(result).toHaveLength(1);
            expect(result[0].idCard).toBe(12345678);
            expect(result[0].status).toBe('waiting');
        });
    });

    describe('getOccupiedOffices', () => {
        it('should delegate to AppointmentRepository', async () => {
            mockRepo.getOccupiedOfficeIds.mockResolvedValue(['1', '3']);

            const result = await service.getOccupiedOffices();

            expect(mockRepo.getOccupiedOfficeIds).toHaveBeenCalled();
            expect(result).toEqual(['1', '3']);
        });

        it('should return empty array when no offices are occupied', async () => {
            const result = await service.getOccupiedOffices();
            expect(result).toEqual([]);
        });
    });
});
