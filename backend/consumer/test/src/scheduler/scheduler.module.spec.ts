import { Test, TestingModule } from "@nestjs/testing";

import { Appointment } from "../../../src/domain/entities/appointment.entity";
import { EventDispatchingAppointmentRepositoryDecorator } from "../../../src/infrastructure/persistence/event-dispatching-appointment-repository.decorator";

describe("EventDispatchingAppointmentRepositoryDecorator", () => {
  let decorator: EventDispatchingAppointmentRepositoryDecorator;
  let mockRepository: any;
  let mockEventBus: { publish: jest.Mock };

  beforeEach(async () => {
    mockRepository = {
      findWaiting: jest.fn(),
      findAvailableOffices: jest.fn(),
      save: jest.fn(),
      findById: jest.fn(),
      findByIdCardAndActive: jest.fn(),
      findExpiredCalled: jest.fn(),
      updateStatus: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EventDispatchingAppointmentRepositoryDecorator,
          useFactory: () =>
            new EventDispatchingAppointmentRepositoryDecorator(
              mockRepository,
              mockEventBus,
            ),
        },
      ],
    }).compile();

    decorator = module.get<EventDispatchingAppointmentRepositoryDecorator>(
      EventDispatchingAppointmentRepositoryDecorator,
    );
  });

  it("should be defined", () => {
    expect(decorator).toBeDefined();
  });

  it("should delegate findWaiting to decoratee", async () => {
    const mockResult = [{ id: "1" }] as Appointment[];
    mockRepository.findWaiting.mockResolvedValue(mockResult);

    const result = await decorator.findWaiting();

    expect(mockRepository.findWaiting).toHaveBeenCalled();
    expect(result).toBe(mockResult);
  });

  it("should delegate findAvailableOffices to decoratee", async () => {
    const mockOffices = ["1", "2", "3"];
    mockRepository.findAvailableOffices.mockResolvedValue(["1", "2"]);

    const result = await decorator.findAvailableOffices(mockOffices);

    expect(mockRepository.findAvailableOffices).toHaveBeenCalledWith(
      mockOffices,
    );
    expect(result).toEqual(["1", "2"]);
  });

  // HUMAN CHECK: Critical test - ensures events are automatically dispatched after save
  it("should save appointment and dispatch events", async () => {
    const mockAppointment = {
      pullEvents: jest.fn().mockReturnValue([{ type: "AppointmentCreated" }]),
    } as unknown as Appointment;

    mockRepository.save.mockResolvedValue(mockAppointment);

    const result = await decorator.save(mockAppointment);

    expect(mockRepository.save).toHaveBeenCalledWith(mockAppointment);
    expect(mockAppointment.pullEvents).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledWith([
      { type: "AppointmentCreated" },
    ]);
    expect(result).toBe(mockAppointment);
  });

  it("should NOT dispatch events if there are no events", async () => {
    const mockAppointment = {
      pullEvents: jest.fn().mockReturnValue([]),
    } as unknown as Appointment;

    mockRepository.save.mockResolvedValue(mockAppointment);

    await decorator.save(mockAppointment);

    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it("should delegate findById to decoratee", async () => {
    const mockAppointment = { id: "123" } as Appointment;
    mockRepository.findById.mockResolvedValue(mockAppointment);

    const result = await decorator.findById("123");

    expect(mockRepository.findById).toHaveBeenCalledWith("123");
    expect(result).toBe(mockAppointment);
  });

  it("should delegate findByIdCardAndActive to decoratee", async () => {
    const mockIdCard = { toValue: () => 12345678 };
    const mockAppointment = { id: "456" } as Appointment;
    mockRepository.findByIdCardAndActive.mockResolvedValue(mockAppointment);

    const result = await decorator.findByIdCardAndActive(mockIdCard as any);

    expect(mockRepository.findByIdCardAndActive).toHaveBeenCalledWith(
      mockIdCard,
    );
    expect(result).toBe(mockAppointment);
  });

  it("should delegate findExpiredCalled to decoratee", async () => {
    const now = Date.now();
    const mockAppointments = [{ id: "1" }, { id: "2" }] as Appointment[];
    mockRepository.findExpiredCalled.mockResolvedValue(mockAppointments);

    const result = await decorator.findExpiredCalled(now);

    expect(mockRepository.findExpiredCalled).toHaveBeenCalledWith(now);
    expect(result).toBe(mockAppointments);
  });

  it("should delegate updateStatus to decoratee", async () => {
    mockRepository.updateStatus.mockResolvedValue(undefined);

    await decorator.updateStatus("123", "completed");

    expect(mockRepository.updateStatus).toHaveBeenCalledWith(
      "123",
      "completed",
    );
  });
});
