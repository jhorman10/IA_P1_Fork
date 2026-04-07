import { AssignDoctorUseCaseImpl } from "../../../../src/application/use-cases/assign-doctor.use-case.impl";
import { MockAppointmentRepository } from "../../../fixtures/mocks/mock-appointment-repository";
import { MockClockPort } from "../../../fixtures/mocks/mock-clock.port";
import { MockLoggerPort } from "../../../fixtures/mocks/mock-logger.port";
import { MockConsultationPolicy } from "../../../fixtures/mocks/mock-consultation-policy";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";
import { Doctor } from "../../../../src/domain/entities/doctor.entity";

describe("AssignDoctorUseCaseImpl", () => {
  let mockAppointmentRepo: MockAppointmentRepository;
  let mockClock: MockClockPort;
  let mockLogger: MockLoggerPort;
  let mockPolicy: MockConsultationPolicy;

  beforeEach(() => {
    mockAppointmentRepo = new MockAppointmentRepository();
    mockClock = new MockClockPort(1000000);
    mockLogger = new MockLoggerPort();
    mockPolicy = new MockConsultationPolicy();
  });

  it("assigns available doctor to waiting appointment", async () => {
    // Arrange: one waiting appointment
    const appt = new Appointment(
      new IdCard(123456789),
      new FullName("Paciente Test"),
      new Priority("medium"),
      "waiting",
      null,
      null,
      1000000,
    );

    mockAppointmentRepo.setFindWaitingResult([appt]);

    // Mock doctor repo
    const availableDoctor = new Doctor(
      "doc-1",
      "Dr House",
      "cardio",
      "1",
      "available",
    );
    const mockDoctorRepo = {
      findAvailable: jest.fn().mockResolvedValue([availableDoctor]),
      updateStatus: jest.fn().mockResolvedValue(availableDoctor),
    } as any;

    const mockAuditPort = { log: jest.fn() } as any;

    const useCase = new AssignDoctorUseCaseImpl(
      mockAppointmentRepo as any,
      mockDoctorRepo,
      mockAuditPort,
      mockLogger as any,
      mockClock as any,
      mockPolicy as any,
    );

    // Act
    await useCase.execute();

    // Assert
    expect(mockAppointmentRepo.saveCalls.length).toBeGreaterThan(0);
    expect(mockDoctorRepo.updateStatus).toHaveBeenCalled();
    expect(mockAuditPort.log).toHaveBeenCalled();
  });
});
import { AssignDoctorUseCaseImpl } from "../../../../src/application/use-cases/assign-doctor.use-case.impl";
import { Appointment } from "../../../../src/domain/entities/appointment.entity";
import { Doctor } from "../../../../src/domain/entities/doctor.entity";
import { AppointmentRepository } from "../../../../src/domain/ports/outbound/appointment.repository";
import { AuditPort } from "../../../../src/domain/ports/outbound/audit.port";
import { ClockPort } from "../../../../src/domain/ports/outbound/clock.port";
import { DoctorRepository } from "../../../../src/domain/ports/outbound/doctor.repository";
import { LoggerPort } from "../../../../src/domain/ports/outbound/logger.port";
import { ConsultationPolicy } from "../../../../src/domain/policies/consultation.policy";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";

function makeAppointment(params: {
  id: string;
  idCard: number;
  fullName: string;
  priority: "high" | "medium" | "low";
  timestamp: number;
}): Appointment {
  return new Appointment(
    new IdCard(params.idCard),
    new FullName(params.fullName),
    new Priority(params.priority),
    "waiting",
    null,
    params.timestamp,
    undefined,
    params.id,
  );
}

describe("AssignDoctorUseCaseImpl", () => {
  let useCase: AssignDoctorUseCaseImpl;
  let appointmentRepository: jest.Mocked<AppointmentRepository>;
  let doctorRepository: jest.Mocked<DoctorRepository>;
  let auditPort: jest.Mocked<AuditPort>;
  let logger: jest.Mocked<LoggerPort>;
  let clock: jest.Mocked<ClockPort>;
  let consultationPolicy: ConsultationPolicy;

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

    auditPort = {
      log: jest.fn(),
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

    consultationPolicy = {
      getRandomDurationSeconds: jest.fn(() => 10),
    } as unknown as ConsultationPolicy;

    useCase = new AssignDoctorUseCaseImpl(
      appointmentRepository,
      doctorRepository,
      auditPort,
      logger,
      clock,
      consultationPolicy,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should assign highest priority patient first", async () => {
    const high = makeAppointment({
      id: "apt-high",
      idCard: 222222,
      fullName: "High",
      priority: "high",
      timestamp: 200,
    });
    const medium = makeAppointment({
      id: "apt-medium",
      idCard: 111111,
      fullName: "Medium",
      priority: "medium",
      timestamp: 100,
    });

    doctorRepository.findAvailable.mockResolvedValue([
      new Doctor("doc-1", "Dr. One", "General", "1", "available"),
    ]);
    appointmentRepository.findWaiting.mockResolvedValue([medium, high]);

    await useCase.execute();

    expect(appointmentRepository.save).toHaveBeenCalledTimes(1);
    const assigned = appointmentRepository.save.mock.calls[0][0];
    expect(assigned.id).toBe("apt-high");
    expect(assigned.status).toBe("called");
  });

  it("should preserve FIFO order within same priority", async () => {
    const early = makeAppointment({
      id: "apt-early",
      idCard: 333333,
      fullName: "Early",
      priority: "medium",
      timestamp: 100,
    });
    const late = makeAppointment({
      id: "apt-late",
      idCard: 444444,
      fullName: "Late",
      priority: "medium",
      timestamp: 200,
    });

    doctorRepository.findAvailable.mockResolvedValue([
      new Doctor("doc-1", "Dr. One", "General", "1", "available"),
      new Doctor("doc-2", "Dr. Two", "General", "2", "available"),
    ]);
    appointmentRepository.findWaiting.mockResolvedValue([late, early]);

    await useCase.execute();

    expect(appointmentRepository.save).toHaveBeenCalledTimes(2);
    expect(appointmentRepository.save.mock.calls[0][0].id).toBe("apt-early");
    expect(appointmentRepository.save.mock.calls[1][0].id).toBe("apt-late");
  });

  it("should not assign when no doctors are available", async () => {
    doctorRepository.findAvailable.mockResolvedValue([]);

    await useCase.execute();

    expect(appointmentRepository.findWaiting).not.toHaveBeenCalled();
    expect(appointmentRepository.save).not.toHaveBeenCalled();
    expect(auditPort.log).not.toHaveBeenCalled();
  });

  it("should set doctor status to busy on assignment", async () => {
    const waiting = makeAppointment({
      id: "apt-1",
      idCard: 555555,
      fullName: "Waiting",
      priority: "high",
      timestamp: 100,
    });
    const doctor = new Doctor("doc-1", "Dr. Busy", "General", "3", "available");

    doctorRepository.findAvailable.mockResolvedValue([doctor]);
    appointmentRepository.findWaiting.mockResolvedValue([waiting]);

    await useCase.execute();

    expect(doctorRepository.updateStatus).toHaveBeenCalledWith("doc-1", "busy");
  });

  it("should create audit log with required fields on assignment", async () => {
    const waiting = makeAppointment({
      id: "apt-audit",
      idCard: 666666,
      fullName: "Audit Patient",
      priority: "high",
      timestamp: 100,
    });

    doctorRepository.findAvailable.mockResolvedValue([
      new Doctor("doc-7", "Dr. Audit", "General", "7", "available"),
    ]);
    appointmentRepository.findWaiting.mockResolvedValue([waiting]);

    await useCase.execute();

    expect(auditPort.log).toHaveBeenCalledTimes(1);
    const entry = auditPort.log.mock.calls[0][0];

    expect(entry.action).toBe("APPOINTMENT_ASSIGNED");
    expect(entry.appointmentId).toBe("apt-audit");
    expect(entry.doctorId).toBe("doc-7");
    expect(entry.timestamp).toBe(1700000000000);
    expect(entry.details).toMatchObject({
      patientIdCard: 666666,
      patientName: "Audit Patient",
      doctorName: "Dr. Audit",
      office: "7",
      priority: "high",
      queuePosition: 1,
    });
  });
});
