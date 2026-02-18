import { AssignAvailableOfficesUseCaseImpl } from '../../src/application/use-cases/assign-available-offices.use-case.impl';
import { Appointment } from '../../src/domain/entities/appointment.entity';

/**
 * ⚕️ HUMAN CHECK - El Desafío del Mock Imposible
 * 
 * Este test es la prueba de fuego de la Arquitectura Hexagonal que hemos construido.
 * - NO levanta NestJS (No usa TestingModule).
 * - NO importa Mongoose ni esquemas de base de datos.
 * - NO importa RabbitMQ ni clientes de microservicios.
 * - NO requiere Docker corriendo.
 * 
 * Resultado: Test Unitario PURO que valida lógica de negocio compleja en milisegundos.
 */

describe('AssignAppointmentsUseCase (Pure Logic - The Impossible Mock Challenge)', () => {
    it('should orchestrate assignment using only pure domain ports', async () => {
        // 1. Mocks de Ports (Interfaces) - Simples objetos que cumplen el contrato
        const mockRepo = {
            findExpiredCalled: jest.fn().mockResolvedValue([]),
            getOccupiedOfficeIds: jest.fn().mockResolvedValue(['1']), // Oficina 1 ocupada
            findWaiting: jest.fn().mockResolvedValue([
                new Appointment('A', 123, 'John', 'high', 'waiting'),
                new Appointment('B', 456, 'Jane', 'medium', 'waiting'),
            ]),
            save: jest.fn(),
        };

        const mockNotifier = {
            notifyAppointmentUpdated: jest.fn(),
        };

        const mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        };

        // 2. Inyección de Dependencias PURA (DIP)
        // Instanciamos la clase directamente sin el DI de NestJS
        const useCase = new AssignAvailableOfficesUseCaseImpl(
            mockRepo as any,
            mockNotifier as any,
            mockLogger as any,
            3 // totalOffices
        );

        // 3. Ejecución de la lógica más compleja (Orquestación de asignación)
        await useCase.execute();

        // 4. Aserciones de Negocio

        // Se debieron asignar 2 turnos (oficinas 2 y 3 libres, oficina 1 ocupada)
        expect(mockRepo.save).toHaveBeenCalledTimes(2);
        expect(mockNotifier.notifyAppointmentUpdated).toHaveBeenCalledTimes(2);

        const firstAssigned = mockRepo.save.mock.calls[0][0];
        const secondAssigned = mockRepo.save.mock.calls[1][0];

        expect(firstAssigned.office).toBe('2');
        expect(secondAssigned.office).toBe('3');
        expect(firstAssigned.status).toBe('called');
        expect(secondAssigned.status).toBe('called');

        // La lógica de negocio está verificada sin haber tocado un solo byte de infraestructura
    });
});
