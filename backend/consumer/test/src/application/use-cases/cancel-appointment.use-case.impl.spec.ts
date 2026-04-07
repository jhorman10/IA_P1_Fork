import { CancelAppointmentUseCaseImpl } from "../../../../src/application/use-cases/cancel-appointment.use-case.impl";
import {
  Appointment,
  AppointmentStatus,
} from "../../../../src/domain/entities/appointment.entity";
import { AppointmentRepository } from "../../../../src/domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../../../src/domain/ports/outbound/audit.port";
import { ClockPort } from "../../../../src/domain/ports/outbound/clock.port";
import { LoggerPort } from "../../../../src/domain/ports/outbound/logger.port";
import { NotificationPort } from "../../../../src/domain/ports/outbound/notification.port";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";

function makeAppointment(id: string, status: AppointmentStatus): Appointment {
  return new Appointment(
    new IdCard(123456),
    new FullName("Patient One"),
    new Priority("medium"),
    status,
    null,
    1000,
    undefined,
    id,
    null,
    null,
  );
}

describe("CancelAppointmentUseCaseImpl", () => {
  let useCase: CancelAppointmentUseCaseImpl;
  let appointmentRepository: jest.Mocked<AppointmentRepository>;
  let notificationPort: jest.Mocked<NotificationPort>;
  let auditPort: jest.Mocked<AuditPort>;
  let clock: jest.Mocked<ClockPort>;
  let logger: jest.Mocked<LoggerPort>;

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

    useCase = new CancelAppointmentUseCaseImpl(
      appointmentRepository,
      notificationPort,
      auditPort,
      clock,
      logger,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should cancel waiting appointment and emit notification/audit", async () => {
    const appointment = makeAppointment("apt-1", "waiting");
    appointmentRepository.findById.mockResolvedValue(appointment);

    await useCase.execute("apt-1");

    expect(appointment.status).toBe("cancelled");
    expect(appointmentRepository.save).toHaveBeenCalledWith(appointment);
    expect(notificationPort.notifyAppointmentUpdated).toHaveBeenCalledWith(
      appointment,
    );
    expect(auditPort.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "APPOINTMENT_CANCELLED",
        appointmentId: "apt-1",
        doctorId: null,
        timestamp: 1700000000000,
      }),
    );
  });

  it("should do nothing when appointment does not exist", async () => {
    appointmentRepository.findById.mockResolvedValue(null);

    await useCase.execute("missing-id");

    expect(appointmentRepository.save).not.toHaveBeenCalled();
    expect(notificationPort.notifyAppointmentUpdated).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
  });

  it("should do nothing when appointment is not in waiting status", async () => {
    const calledAppointment = makeAppointment("apt-2", "called");
    appointmentRepository.findById.mockResolvedValue(calledAppointment);

    await useCase.execute("apt-2");

    expect(appointmentRepository.save).not.toHaveBeenCalled();
    expect(notificationPort.notifyAppointmentUpdated).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
  });
});
