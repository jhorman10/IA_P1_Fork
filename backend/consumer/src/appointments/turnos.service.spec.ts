import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { TurnosService } from './turnos.service';
import { Appointment } from '../schemas/appointment.schema';

describe('TurnosService', () => {
    let service: TurnosService;
    let model: any;

    const mockAppointment = {
        idCard: 12345678,
        fullName: 'John Doe',
        priority: 'medium',
        status: 'waiting',
        timestamp: Date.now(),
        save: jest.fn().mockResolvedValue({
            idCard: 12345678,
            fullName: 'John Doe',
            _id: 'mockId',
        }),
    };

    const mockAppointmentModel = function (dto: any) {
        return {
            ...dto,
            save: jest.fn().mockResolvedValue({
                ...dto,
                _id: 'mockId',
            }),
        };
    };

    mockAppointmentModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
    });
    mockAppointmentModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
    });
    mockAppointmentModel.updateMany = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    });

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TurnosService,
                {
                    provide: getModelToken(Appointment.name),
                    useValue: mockAppointmentModel,
                },
            ],
        }).compile();

        service = module.get<TurnosService>(TurnosService);
        model = module.get(getModelToken(Appointment.name));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAppointment', () => {
        it('should create an appointment', async () => {
            const dto = { idCard: 12345678, fullName: 'John Doe', priority: 'high' as any };
            const result = await service.createAppointment(dto);
            expect(result).toBeDefined();
            expect(result.idCard).toBe(12345678);
        });
    });

    describe('findWaitingAppointments', () => {
        it('should return waiting appointments sorted by priority', async () => {
            const appointments = [
                { priority: 'low', timestamp: 100, status: 'waiting' },
                { priority: 'high', timestamp: 50, status: 'waiting' },
                { priority: 'medium', timestamp: 75, status: 'waiting' },
            ];
            model.find.mockReturnValue({
                exec: jest.fn().mockResolvedValue(appointments),
            });

            const result = await service.findWaitingAppointments();
            expect(result[0].priority).toBe('high');
            expect(result[1].priority).toBe('medium');
            expect(result[2].priority).toBe('low');
        });
    });
});
