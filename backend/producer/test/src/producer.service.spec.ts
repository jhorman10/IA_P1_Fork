import { Test, TestingModule } from '@nestjs/testing';
import { ProducerService } from 'src/producer.service';
import { AppointmentPublisherPort } from 'src/domain/ports/outbound/appointment-publisher.port';

describe('ProducerService', () => {
    let service: ProducerService;
    let mockPublisher: jest.Mocked<AppointmentPublisherPort>;

    beforeEach(async () => {
        mockPublisher = {
            publishAppointmentCreated: jest.fn(),
        } as unknown as jest.Mocked<AppointmentPublisherPort>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProducerService,
                {
                    provide: 'AppointmentPublisherPort',
                    useValue: mockPublisher,
                },
            ],
        }).compile();

        service = module.get<ProducerService>(ProducerService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('createAppointment - Success cases', () => {
        it('should publish appointment and return accepted status', async () => {
            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            const result = await service.createAppointment(createAppointmentDto);

            expect(mockPublisher.publishAppointmentCreated).toHaveBeenCalledWith(createAppointmentDto);
            expect(result).toEqual({
                status: 'accepted',
                message: 'Appointment assignment in progress',
            });
        });
    });

    describe('createAppointment - Error handling', () => {
        it('should throw error if publishing fails', async () => {
            const publishError = new Error('Publishing failed');
            mockPublisher.publishAppointmentCreated.mockRejectedValue(publishError);

            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            await expect(service.createAppointment(createAppointmentDto)).rejects.toThrow('Publishing failed');
        });
    });
});
