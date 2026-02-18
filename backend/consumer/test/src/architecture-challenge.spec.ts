import { AssignAvailableOfficesUseCaseImpl } from '../../src/application/use-cases/assign-available-offices.use-case.impl';
import { Appointment } from '../../src/domain/entities/appointment.entity';
import { IdCard } from '../../src/domain/value-objects/id-card.value-object';

/**
 * ⚕️ HUMAN CHECK - El Desafío del Mock Imposible
 * 
 * Este test es la prueba de fuego de la Arquitectura Hexagonal que hemos construido.
 */

describe('AssignAppointmentsUseCase (Pure Logic - The Impossible Mock Challenge)', () => {
    it('should orchestrate assignment using only pure domain ports', async () => {
        // 1. Mocks de Ports (Interfaces)
        const mockRepo = {
            findExpiredCalled: jest.fn().mockResolvedValue([]),
            getOccupiedOfficeIds: jest.fn().mockResolvedValue(['1']),
            findWaiting: jest.fn().mockResolvedValue([
                new Appointment('A', new IdCard(123), 'John', 'high', 'waiting'),
                new Appointment('B', new IdCard(456), 'Jane', 'medium', 'waiting'),
            ]),
            save: jest.fn(),
        };

        const mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        };

        const mockClock = {
            now: jest.fn().mockReturnValue(Date.now()),
            isoNow: jest.fn().mockReturnValue(new Date().toISOString()),
        };

        const mockEventBus = {
            publish: jest.fn().mockResolvedValue(undefined),
        };

        // 2. Inyección de Dependencias PURA (DIP)
        const useCase = new AssignAvailableOfficesUseCaseImpl(
            mockRepo as any,
            mockLogger as any,
            mockClock as any,
            mockEventBus as any,
            3 // totalOffices
        );

        // 3. Ejecución
        await useCase.execute();

        // 4. Aserciones de Negocio
        expect(mockRepo.save).toHaveBeenCalledTimes(2);
        expect(mockEventBus.publish).toHaveBeenCalledTimes(2);

        const firstAssigned = mockRepo.save.mock.calls[0][0];
        expect(firstAssigned.office).toBe('2');
        expect(firstAssigned.status).toBe('called');
    });
});
