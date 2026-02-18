import { Test, TestingModule } from '@nestjs/testing';
import { CreateAppointmentUseCaseImpl } from 'src/application/use-cases/create-appointment.use-case.impl';
import { AppointmentPublisherPort } from 'src/domain/ports/outbound/appointment-publisher.port';

/**
 * ⚕️ HUMAN CHECK - Hexagonal Use Case Test:
 * Tests the use-case implementation, mocking the outbound port.
 */
describe('CreateAppointmentUseCaseImpl', () => {
    let useCase: CreateAppointmentUseCaseImpl;
    let mockPublisher: jest.Mocked<AppointmentPublisherPort>;

    beforeEach(async () => {
        mockPublisher = {
            publishAppointmentCreated: jest.fn(),
        } as unknown as jest.Mocked<AppointmentPublisherPort>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CreateAppointmentUseCaseImpl,
                {
                    provide: 'AppointmentPublisherPort',
                    useValue: mockPublisher,
                },
            ],
        }).compile();

        useCase = module.get<CreateAppointmentUseCaseImpl>(CreateAppointmentUseCaseImpl);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('execute - Success cases', () => {
        it('should publish appointment and return accepted status', async () => {
            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            const result = await useCase.execute(createAppointmentDto);

            expect(mockPublisher.publishAppointmentCreated).toHaveBeenCalledWith(createAppointmentDto);
            expect(result).toEqual({
                status: 'accepted',
                message: 'Appointment assignment in progress',
            });
        });
    });

    describe('execute - Error handling', () => {
        it('should throw error if publishing fails', async () => {
            const publishError = new Error('Publishing failed');
            mockPublisher.publishAppointmentCreated.mockRejectedValue(publishError);

            const createAppointmentDto = {
                idCard: 123456789,
                fullName: 'John Doe',
            };

            await expect(useCase.execute(createAppointmentDto)).rejects.toThrow('Publishing failed');
        });
    });
});
