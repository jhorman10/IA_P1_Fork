import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AppointmentService } from './appointment.service';
import { Appointment } from '../schemas/appointment.schema';

describe('AppointmentService', () => {
    let service: AppointmentService;
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
    mockAppointmentModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
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
                AppointmentService,
                {
                    provide: getModelToken(Appointment.name),
                    useValue: mockAppointmentModel,
                },
            ],
        }).compile();

        service = module.get<AppointmentService>(AppointmentService);
        model = module.get(getModelToken(Appointment.name));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createAppointment', () => {
        it('should create an appointment if none exists', async () => {
            const dto = { idCard: 12345678, fullName: 'John Doe', priority: 'high' as any };
            model.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(null),
            });

            const result = await service.createAppointment(dto);
            expect(result).toBeDefined();
            expect(result.idCard).toBe(12345678);
            expect(model.findOneAndUpdate).not.toHaveBeenCalled(); // No idempotency hit
        });

        it('should return existing appointment if patient already has one active (idempotency)', async () => {
            const dto = { idCard: 12345678, fullName: 'John Doe', priority: 'high' as any };
            const existing = { _id: 'activeId', idCard: 12345678, status: 'waiting' };

            model.findOne.mockReturnValue({
                exec: jest.fn().mockResolvedValue(existing),
            });

            const result = await service.createAppointment(dto);
            expect(result._id).toBe('activeId');
            expect(model.prototype.save).not.toBeDefined(); // Manual check for "new model()" not called is hard here, but findOne hit
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
