import { CompleteExpiredAppointmentsUseCaseImpl } from "../../../../src/application/use-cases/complete-expired-appointments.use-case.impl";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { Doctor } from "../../../../src/domain/entities/doctor.entity";
import { AppointmentRepository } from "../../../../src/domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../../../src/domain/ports/outbound/audit.port";
import { ClockPort } from "../../../../src/domain/ports/outbound/clock.port";
import { DoctorRepository } from "../../../../src/domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../../../src/domain/ports/outbound/logger.port";
import { NotificationPort } from "../../../../src/domain/ports/outbound/notification.port";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";

function makeCalledAppointment(params: {
  id: string;
  idCard: number;
  fullName: string;
  office: string;
  doctorId: string | null;
  doctorName: string | null;
}): Appointment {
  return new Appointment(
    new IdCard(params.idCard),
    new FullName(params.fullName),
    new Priority("medium"),
    "called",
    params.office,
    1000,
    900,
    params.id,
    params.doctorId,
    params.doctorName,
  );
}

describe("CompleteExpiredAppointmentsUseCaseImpl", () => {
  let useCase: CompleteExpiredAppointmentsUseCaseImpl;
  let appointmentRepository: jest.Mocked<AppointmentRepository>;
  let notificationPort: jest.Mocked<NotificationPort>;
  let logger: jest.Mocked<LoggerPort>;
  let clock: jest.Mocked<ClockPort>;
  let doctorRepository: jest.Mocked<DoctorRepository>;
  let auditPort: jest.Mocked<AuditPort>;

  beforeEach(() => {
    appointmentRepository = {
      findWaiting: jest.fn(),
      findAvailableOffices: jest.fn(),
      findById: jest.fn(),
      findByIdCardAndActive: jest.fn(),
      findExpiredCalled: jest.fn(),
      save: jest.fn(async (appointment) => appointment),
      updateStatus: jest.fn(),
    };

    notificationPort = {
      notifyAppointmentUpdated: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    clock = {
      now: jest.fn(() => 1700000000000),
      isoNow: jest.fn(() => new Date(1700000000000).toISOString()),
    };

    doctorRepository = {
      findAvailable: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
      markBusyAtomic: jest.fn().mockResolvedValue(true),
    };

    auditPort = {
      log: jest.fn(),
    };

    useCase = new CompleteExpiredAppointmentsUseCaseImpl(
      appointmentRepository,
      notificationPort,
      logger,
      clock,
      doctorRepository,
      auditPort,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should complete expired appointment and release assigned doctor", async () => {
    const appointment = makeCalledAppointment({
      id: "apt-1",
      idCard: 123456,
      fullName: "Patient One",
      office: "3",
      doctorId: "doc-1",
      doctorName: "Dr. One",
    });

    appointmentRepository.findExpiredCalled.mockResolvedValue([appointment]);
    doctorRepository.findById.mockResolvedValue(
      new Doctor("doc-1", "Dr. One", "General", "3", "busy"),
    );

    await useCase.execute();

    expect(appointmentRepository.save).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.save.mock.calls[0][0].status).toBe("completed");
    expect(notificationPort.notifyAppointmentUpdated).toHaveBeenCalledTimes(1);
    expect(doctorRepository.updateStatus).toHaveBeenCalledWith(
      "doc-1",
      "available",
    );
    expect(auditPort.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "APPOINTMENT_COMPLETED",
        appointmentId: "apt-1",
        doctorId: "doc-1",
        timestamp: 1700000000000,
      }),
    );
  });

  it("should complete appointment without doctor release when doctorId is null", async () => {
    const appointment = makeCalledAppointment({
      id: "apt-2",
      idCard: 654321,
      fullName: "Patient Two",
      office: "4",
      doctorId: null,
      doctorName: null,
    });

    appointmentRepository.findExpiredCalled.mockResolvedValue([appointment]);

    await useCase.execute();

    expect(appointmentRepository.save).toHaveBeenCalledTimes(1);
    expect(notificationPort.notifyAppointmentUpdated).toHaveBeenCalledTimes(1);
    expect(doctorRepository.findById).not.toHaveBeenCalled();
    expect(doctorRepository.updateStatus).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
  });

  it("should do nothing when there are no expired appointments", async () => {
    appointmentRepository.findExpiredCalled.mockResolvedValue([]);

    await useCase.execute();

    expect(appointmentRepository.save).not.toHaveBeenCalled();
    expect(notificationPort.notifyAppointmentUpdated).not.toHaveBeenCalled();
    expect(doctorRepository.updateStatus).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
  });
});
