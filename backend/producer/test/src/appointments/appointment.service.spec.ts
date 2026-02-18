import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentService } from 'src/appointments/appointment.service';
import { AppointmentReadRepository } from 'src/domain/ports/outbound/appointment-read.repository';
import { AppointmentEventPayload } from 'src/types/appointment-event';

/**
 * ⚕️ HUMAN CHECK - DIP Verification:
 * AppointmentService facade depends only on AppointmentReadRepository port.
 * No Mongoose imports should exist in this test.
 */
describe('AppointmentService (Producer Facade)', () => {
    let service: AppointmentService;
    let mockRepo: jest.Mocked<AppointmentReadRepository>;

    const mockPayloads: AppointmentEventPayload[] = [
        {
            id: 'abc-123',
            fullName: 'John Doe',
            idCard: 12345678,
            office: '3',
            status: 'called',
            priority: 'medium',
            timestamp: Date.now(),
        },
        {
            id: 'def-456',
            fullName: 'Jane Smith',
            idCard: 87654321,
            office: null,
            status: 'waiting',
            priority: 'high',
            timestamp: Date.now(),
        },
    ];

    beforeEach(async () => {
        mockRepo = {
            findAll: jest.fn(),
            findByIdCard: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppointmentService,
                {
                    provide: 'AppointmentReadRepository',
                    useValue: mockRepo,
                },
            ],
        }).compile();

        service = module.get<AppointmentService>(AppointmentService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should delegate to AppointmentReadRepository.findAll()', async () => {
            mockRepo.findAll.mockResolvedValue(mockPayloads);

            const result = await service.findAll();

            expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
            expect(result).toEqual(mockPayloads);
            expect(result).toHaveLength(2);
        });

        it('should return empty array when no appointments exist', async () => {
            mockRepo.findAll.mockResolvedValue([]);

            const result = await service.findAll();

            expect(result).toEqual([]);
        });
    });

    describe('findByIdCard', () => {
        it('should delegate to AppointmentReadRepository.findByIdCard()', async () => {
            const idCard = 12345678;
            mockRepo.findByIdCard.mockResolvedValue([mockPayloads[0]]);

            const result = await service.findByIdCard(idCard);

            expect(mockRepo.findByIdCard).toHaveBeenCalledWith(idCard);
            expect(result).toEqual([mockPayloads[0]]);
        });

        it('should propagate NotFoundException from repository', async () => {
            const { NotFoundException } = require('@nestjs/common');
            mockRepo.findByIdCard.mockRejectedValue(
                new NotFoundException('No appointments found for ID card 999'),
            );

            await expect(service.findByIdCard(999)).rejects.toThrow(NotFoundException);
        });
    });
});
