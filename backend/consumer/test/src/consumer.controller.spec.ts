import { Test, TestingModule } from '@nestjs/testing';
import { ConsumerController } from '../../src/consumer.controller';
import { RmqContext } from '@nestjs/microservices';
import { ValidationError } from '../../src/domain/errors/validation.error';

describe('ConsumerController', () => {
    let controller: ConsumerController;
    let registerUseCase: any;

    const mockRegisterUseCase = {
        execute: jest.fn(),
    };

    const mockChannel = {
        ack: jest.fn(),
        nack: jest.fn(),
    };

    const mockContext = {
        getChannelRef: () => mockChannel,
        getMessage: () => ({
            properties: { headers: {} }
        }),
    } as unknown as RmqContext;

    beforeEach(async () => {
        jest.clearAllMocks();
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ConsumerController],
            providers: [
                { provide: 'RegisterAppointmentUseCase', useValue: mockRegisterUseCase },
            ],
        }).compile();

        controller = module.get<ConsumerController>(ConsumerController);
        registerUseCase = module.get('RegisterAppointmentUseCase');
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should ack message on success', async () => {
        mockRegisterUseCase.execute.mockResolvedValue({ id: '123' });

        await controller.handleCreateAppointment({ idCard: 1234, fullName: 'Test' }, mockContext);

        expect(registerUseCase.execute).toHaveBeenCalled();
        expect(mockChannel.ack).toHaveBeenCalled();
    });

    it('should nack and move to DLQ on ValidationError (fatal)', async () => {
        mockRegisterUseCase.execute.mockRejectedValue(new ValidationError('Invalid data'));

        await controller.handleCreateAppointment({ idCard: 0, fullName: '' }, mockContext);

        expect(mockChannel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
    });

    it('should nack and requeue on transient error', async () => {
        mockRegisterUseCase.execute.mockRejectedValue(new Error('Transient Error'));

        await controller.handleCreateAppointment({ idCard: 1234, fullName: 'Test' }, mockContext);

        expect(mockChannel.nack).toHaveBeenCalledWith(expect.anything(), false, true);
    });

    it('should nack and move to DLQ on max retries', async () => {
        const contextWithRetries = {
            getChannelRef: () => mockChannel,
            getMessage: () => ({
                properties: {
                    headers: {
                        'x-death': [{ count: 2 }]
                    }
                }
            }),
        } as unknown as RmqContext;

        mockRegisterUseCase.execute.mockRejectedValue(new Error('Persistent Error'));

        await controller.handleCreateAppointment({ idCard: 1234, fullName: 'Test' }, contextWithRetries);

        expect(mockChannel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
    });
});
