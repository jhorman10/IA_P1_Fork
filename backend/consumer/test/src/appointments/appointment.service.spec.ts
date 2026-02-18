import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from 'src/appointments/appointment.service';
import { Appointment } from 'src/domain/entities/appointment.entity';
import { IdCard } from 'src/domain/value-objects/id-card.value-object';
import { FullName } from 'src/domain/value-objects/full-name.value-object';
import { Priority } from 'src/domain/value-objects/priority.value-object';

describe('AppointmentService', () => {
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

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAppointment', () => {
        it('should delegate to RegisterAppointmentUseCase', async () => {
            const dto = { idCard: 12345678, fullName: 'John Doe' };
            const result = await service.createAppointment(dto as any);
            expect(mockRegisterUseCase.execute).toHaveBeenCalled();
            expect(result.idCard).toBe(12345678);
        });
    });

    describe('findWaitingAppointments', () => {
        it('should delegate to AppointmentRepository', async () => {
            await service.findWaitingAppointments();
            expect(mockRepo.findWaiting).toHaveBeenCalled();
        });
    });
});
