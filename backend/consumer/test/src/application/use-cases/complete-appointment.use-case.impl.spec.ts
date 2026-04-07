import { CompleteAppointmentUseCaseImpl } from "../../../../src/application/use-cases/complete-appointment.use-case.impl";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { Doctor } from "../../../../src/domain/entities/doctor.entity";
import { AssignAvailableOfficesUseCase } from "../../../../src/domain/ports/inbound/assign-available-offices.use-case";
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
  doctorId: string | null;
  doctorName: string | null;
}): Appointment {
  return new Appointment(
    new IdCard(123456),
    new FullName("Patient One"),
    new Priority("medium"),
    "called",
    "3",
    1000,
    9000,
    params.id,
    params.doctorId,
    params.doctorName,
  );
}

function makeWaitingAppointment(id: string): Appointment {
  return new Appointment(
    new IdCard(123456),
    new FullName("Patient One"),
    new Priority("medium"),
    "waiting",
    null,
    1000,
    undefined,
    id,
    null,
    null,
  );
}

describe("CompleteAppointmentUseCaseImpl", () => {
  let useCase: CompleteAppointmentUseCaseImpl;
  let appointmentRepository: jest.Mocked<AppointmentRepository>;
  let doctorRepository: jest.Mocked<DoctorRepository>;
  let notificationPort: jest.Mocked<NotificationPort>;
  let auditPort: jest.Mocked<AuditPort>;
  let clock: jest.Mocked<ClockPort>;
  let logger: jest.Mocked<LoggerPort>;
  let assignUseCase: jest.Mocked<AssignAvailableOfficesUseCase>;

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

    doctorRepository = {
      findAvailable: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      updateStatus: jest.fn(),
    };

    notificationPort = {
      notifyAppointmentUpdated: jest.fn(),
    };

    auditPort = {
      log: jest.fn(),
    };

    clock = {
      now: jest.fn(() => 1700000000000),
      isoNow: jest.fn(() => new Date(1700000000000).toISOString()),
    };

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    };

    assignUseCase = {
      execute: jest.fn(),
    };

    useCase = new CompleteAppointmentUseCaseImpl(
      appointmentRepository,
      doctorRepository,
      notificationPort,
      auditPort,
      clock,
      logger,
      assignUseCase,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should complete called appointment, release doctor, and trigger assignment", async () => {
    const appointment = makeCalledAppointment({
      id: "apt-1",
      doctorId: "doc-1",
      doctorName: "Dr. One",
    });

    appointmentRepository.findById.mockResolvedValue(appointment);
    doctorRepository.findById.mockResolvedValue(
      new Doctor("doc-1", "Dr. One", "General", "3", "busy"),
    );

    await useCase.execute("apt-1");

    expect(appointment.status).toBe("completed");
    expect(appointmentRepository.save).toHaveBeenCalledWith(appointment);
    expect(notificationPort.notifyAppointmentUpdated).toHaveBeenCalledWith(
      appointment,
    );
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
    expect(assignUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it("should complete called appointment without doctor release when doctorId is null", async () => {
    const appointment = makeCalledAppointment({
      id: "apt-2",
      doctorId: null,
      doctorName: null,
    });

    appointmentRepository.findById.mockResolvedValue(appointment);

    await useCase.execute("apt-2");

    expect(appointment.status).toBe("completed");
    expect(appointmentRepository.save).toHaveBeenCalledWith(appointment);
    expect(notificationPort.notifyAppointmentUpdated).toHaveBeenCalledWith(
      appointment,
    );
    expect(doctorRepository.findById).not.toHaveBeenCalled();
    expect(doctorRepository.updateStatus).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
    expect(assignUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it("should do nothing when appointment does not exist", async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await useCase.execute("missing-id");

    expect(appointmentRepository.save).not.toHaveBeenCalled();
    expect(notificationPort.notifyAppointmentUpdated).not.toHaveBeenCalled();
    expect(doctorRepository.updateStatus).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
    expect(assignUseCase.execute).not.toHaveBeenCalled();
  });

  it("should do nothing when appointment is not in called status", async () => {
    const waitingAppointment = makeWaitingAppointment("apt-3");
    appointmentRepository.findById.mockResolvedValue(waitingAppointment);

    await useCase.execute("apt-3");

    expect(appointmentRepository.save).not.toHaveBeenCalled();
    expect(notificationPort.notifyAppointmentUpdated).not.toHaveBeenCalled();
    expect(doctorRepository.updateStatus).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
    expect(assignUseCase.execute).not.toHaveBeenCalled();
  });
});
