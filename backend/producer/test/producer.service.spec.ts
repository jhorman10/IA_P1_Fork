import { Test, TestingModule } from '@nestjs/testing';
import { ProducerService } from '../src/producer.service';
import { ClientProxy } from '@nestjs/microservices';

describe('ProducerService', () => {
    let service: ProducerService;
    let mockClientProxy: jest.Mocked<ClientProxy>;

    beforeEach(async () => {
        mockClientProxy = {
            emit: jest.fn(),
        } as unknown as jest.Mocked<ClientProxy>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProducerService,
                {
                    provide: 'TURNOS_SERVICE',
                    useValue: mockClientProxy,
                },
            ],
        }).compile();

        service = module.get<ProducerService>(ProducerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createAppointment - Success cases', () => {
        it('should send appointment to RabbitMQ and return accepted status', async () => {
            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            const result = await service.createAppointment(createAppointmentDto);

            expect(mockClientProxy.emit).toHaveBeenCalledWith('create_appointment', createAppointmentDto);
            expect(result).toEqual({
                status: 'accepted',
                message: 'Appointment assignment in progress',
            });
        });

        it('should send event with exact name "create_appointment"', async () => {
            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            await service.createAppointment(createAppointmentDto);

            const eventName = mockClientProxy.emit.mock.calls[0][0];
            expect(eventName).toBe('create_appointment');
        });
    });

    describe('createAppointment - Error handling', () => {
        it('should throw error if RabbitMQ fails', async () => {
            const rabbitError = new Error('AMQP connection failed');
            mockClientProxy.emit.mockImplementationOnce(() => {
                throw rabbitError;
            });

            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            await expect(service.createAppointment(createAppointmentDto)).rejects.toThrow('AMQP connection failed');
        });
    });
});
