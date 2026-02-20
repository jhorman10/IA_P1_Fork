import { AssignAvailableOfficesUseCaseImpl } from "../../src/application/use-cases/assign-available-offices.use-case.impl";
import { Appointment } from "../../src/domain/entities/appointment.entity";
import { ConsultationPolicy } from "../../src/domain/policies/consultation.policy";
import { IdCard } from "../../src/domain/value-objects/id-card.value-object";
import { FullName } from "../../src/domain/value-objects/full-name.value-object";
import { Priority } from "../../src/domain/value-objects/priority.value-object";

/**
 * ⚕️ HUMAN CHECK - El Desafío del Mock Imposible
 *
 * Este test es la prueba de fuego de la Arquitectura Hexagonal que hemos construido.
 */

describe("AssignAppointmentsUseCase (Pure Logic - The Impossible Mock Challenge)", () => {
  it("should orchestrate assignment using only pure domain ports", async () => {
    // 1. Mocks de Ports (Interfaces)
    // Mock completo de AppointmentRepository
    interface RepoMock {
      findWaiting: jest.Mock<Promise<Appointment[]>, []>;
      findAvailableOffices: jest.Mock<Promise<string[]>, [string[]]>;
      save: jest.Mock<Promise<Appointment>, [Appointment]>;
      findById: jest.Mock<Promise<Appointment | null>, [string]>;
      findByIdCardAndActive: jest.Mock<Promise<Appointment | null>, [IdCard]>;
      findExpiredCalled: jest.Mock<Promise<Appointment[]>, [number]>;
      updateStatus: jest.Mock<Promise<void>, [string, string]>;
    }
    interface LoggerMock {
      log: jest.Mock<void, unknown[]>;
      error: jest.Mock<void, unknown[]>;
      warn: jest.Mock<void, unknown[]>;
      debug: jest.Mock<void, unknown[]>;
      verbose: jest.Mock<void, unknown[]>;
    }
    interface ClockMock {
      now: jest.Mock<number, []>;
      isoNow: jest.Mock<string, []>;
    }
    const mockRepo: RepoMock = {
      findWaiting: jest
        .fn()
        .mockResolvedValue([
          new Appointment(
            new IdCard(123456789),
            new FullName("John Doe"),
            new Priority("high"),
            "waiting",
          ),
          new Appointment(
            new IdCard(987654321),
            new FullName("Jane Doe"),
            new Priority("medium"),
            "waiting",
          ),
        ]),
      findAvailableOffices: jest.fn().mockResolvedValue(["2", "3"]),
      save: jest.fn().mockResolvedValue(undefined as unknown as Appointment),
      findById: jest.fn().mockResolvedValue(null),
      findByIdCardAndActive: jest.fn().mockResolvedValue(null),
      findExpiredCalled: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue(undefined),
    };

    const mockLogger: LoggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    const mockClock: ClockMock = {
      now: jest.fn().mockReturnValue(Date.now()),
      isoNow: jest.fn().mockReturnValue(new Date().toISOString()),
    };

    // 2. Inyección de Dependencias PURA (DIP)
    const useCase = new AssignAvailableOfficesUseCaseImpl(
      mockRepo,
      mockLogger,
      mockClock,
      3, // totalOffices
      new ConsultationPolicy(), // ⚕️ H-07: Injectable policy
    );

    // 3. Ejecución
    await useCase.execute();

    // 4. Aserciones de Negocio
    expect(mockRepo.save).toHaveBeenCalledTimes(2);

    const firstAssigned = mockRepo.save.mock.calls[0][0];
    expect(firstAssigned.office).toBe("2");
    expect(firstAssigned.status).toBe("called");
  });
});
