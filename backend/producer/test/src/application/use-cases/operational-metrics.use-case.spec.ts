import { Test, TestingModule } from "@nestjs/testing";
import { OperationalMetricsUseCaseImpl } from "src/application/use-cases/operational-metrics.use-case.impl";
import { AppointmentView } from "src/domain/models/appointment-view";
import { DoctorView } from "src/domain/models/doctor-view";
import { CONSUMER_AUDIT_LOG_QUERY_PORT } from "src/domain/ports/outbound/consumer-audit-log-query.port";

/**
 * SPEC-013: Unit tests for OperationalMetricsUseCaseImpl
 * Verifies appointment/doctor aggregation, throughput calculation, and edge cases.
 * avgWaitTimeMinutes / avgConsultationTimeMinutes are computed from consumer audit_logs.
 */
describe("OperationalMetricsUseCaseImpl", () => {
  let useCase: OperationalMetricsUseCaseImpl;
  let mockQueryAppointments: { findAll: jest.Mock; findByIdCard: jest.Mock };
  let mockDoctorService: { findAll: jest.Mock };
  let mockConsumerAuditLog: { findTimingEvents: jest.Mock };

  const todayStart = (() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  })();

  const yesterdayMs = todayStart - 1; // just before today

  const makeAppointment = (
    overrides: Partial<AppointmentView> = {},
  ): AppointmentView => ({
    id: "appt-1",
    fullName: "Patient One",
    idCard: 12345678,
    office: null,
    status: "waiting",
    priority: "medium",
    timestamp: todayStart + 1000,
    completedAt: undefined,
    doctorId: null,
    ...overrides,
  });

  const makeDoctor = (
    id: string,
    status: DoctorView["status"],
  ): DoctorView => ({
    id,
    name: `Dr. ${id}`,
    specialty: "General",
    office: "1",
    status,
  });

  beforeEach(async () => {
    mockQueryAppointments = {
      findAll: jest.fn(),
      findByIdCard: jest.fn(),
    };
    mockDoctorService = {
      findAll: jest.fn(),
    };
    mockConsumerAuditLog = {
      findTimingEvents: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationalMetricsUseCaseImpl,
        {
          provide: "QueryAppointmentsUseCase",
          useValue: mockQueryAppointments,
        },
        {
          provide: "DoctorService",
          useValue: mockDoctorService,
        },
        {
          provide: CONSUMER_AUDIT_LOG_QUERY_PORT,
          useValue: mockConsumerAuditLog,
        },
      ],
    }).compile();

    useCase = module.get<OperationalMetricsUseCaseImpl>(
      OperationalMetricsUseCaseImpl,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getMetrics — happy path with mixed data", () => {
    it("should return correct appointment and doctor counts", async () => {
      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({ id: "w1", status: "waiting" }),
        makeAppointment({ id: "w2", status: "waiting" }),
        makeAppointment({ id: "c1", status: "called" }),
        makeAppointment({
          id: "comp1",
          status: "completed",
          completedAt: todayStart + 5000,
        }),
        makeAppointment({
          id: "comp2",
          status: "completed",
          completedAt: todayStart + 10000,
        }),
        // completed yesterday — should NOT count in completedToday
        makeAppointment({
          id: "comp-old",
          status: "completed",
          completedAt: yesterdayMs,
        }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([
        makeDoctor("d1", "available"),
        makeDoctor("d2", "available"),
        makeDoctor("d3", "busy"),
        makeDoctor("d4", "offline"),
      ]);

      const result = await useCase.getMetrics();

      expect(result.appointments.waiting).toBe(2);
      expect(result.appointments.called).toBe(1);
      expect(result.appointments.completedToday).toBe(2);

      expect(result.doctors.available).toBe(2);
      expect(result.doctors.busy).toBe(1);
      expect(result.doctors.offline).toBe(1);

      expect(result.generatedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    });
  });

  describe("getMetrics — empty data (edge case: start of day, no appointments)", () => {
    it("should return all zeroes and null averages", async () => {
      mockQueryAppointments.findAll.mockResolvedValue([]);
      mockDoctorService.findAll.mockResolvedValue([]);
      // No audit events → averages must be null

      const result = await useCase.getMetrics();

      expect(result.appointments.waiting).toBe(0);
      expect(result.appointments.called).toBe(0);
      expect(result.appointments.completedToday).toBe(0);
      expect(result.doctors.available).toBe(0);
      expect(result.doctors.busy).toBe(0);
      expect(result.doctors.offline).toBe(0);
      expect(result.performance.avgWaitTimeMinutes).toBeNull();
      expect(result.performance.avgConsultationTimeMinutes).toBeNull();
    });
  });

  describe("getMetrics — throughput calculation", () => {
    it("should calculate throughputPerHour > 0 when there are completedToday", async () => {
      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({
          id: "comp1",
          status: "completed",
          completedAt: todayStart + 5000,
        }),
        makeAppointment({
          id: "comp2",
          status: "completed",
          completedAt: todayStart + 10000,
        }),
        makeAppointment({
          id: "comp3",
          status: "completed",
          completedAt: todayStart + 15000,
        }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);

      const result = await useCase.getMetrics();

      expect(result.appointments.completedToday).toBe(3);
      expect(result.performance.throughputPerHour).toBeGreaterThan(0);
    });

    it("should return throughputPerHour = 0 when no appointments completed today", async () => {
      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({ id: "w1", status: "waiting" }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);

      const result = await useCase.getMetrics();

      expect(result.performance.throughputPerHour).toBe(0);
    });
  });

  describe("getMetrics — avg times from audit_logs", () => {
    it("should return null averages when no audit events exist", async () => {
      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({
          id: "comp1",
          status: "completed",
          completedAt: todayStart + 3600000,
        }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);
      // findTimingEvents already returns [] by default

      const result = await useCase.getMetrics();

      expect(result.performance.avgWaitTimeMinutes).toBeNull();
      expect(result.performance.avgConsultationTimeMinutes).toBeNull();
    });

    it("should compute avgWaitTimeMinutes from APPOINTMENT_ASSIGNED events", async () => {
      // Appointment created at todayStart+0, assigned 10 min later
      const createdAt = todayStart;
      const assignedAt = todayStart + 10 * 60 * 1000; // +10 min

      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({ id: "a1", status: "called", timestamp: createdAt }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);
      mockConsumerAuditLog.findTimingEvents.mockResolvedValue([
        {
          appointmentId: "a1",
          action: "APPOINTMENT_ASSIGNED",
          timestamp: assignedAt,
        },
      ]);

      const result = await useCase.getMetrics();

      expect(result.performance.avgWaitTimeMinutes).toBeCloseTo(10, 5);
      expect(result.performance.avgConsultationTimeMinutes).toBeNull();
    });

    it("should average wait times across multiple appointments", async () => {
      const createdAt = todayStart;
      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({ id: "a1", status: "called", timestamp: createdAt }),
        makeAppointment({ id: "a2", status: "called", timestamp: createdAt }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);
      mockConsumerAuditLog.findTimingEvents.mockResolvedValue([
        {
          appointmentId: "a1",
          action: "APPOINTMENT_ASSIGNED",
          timestamp: createdAt + 6 * 60 * 1000, // 6 min
        },
        {
          appointmentId: "a2",
          action: "APPOINTMENT_ASSIGNED",
          timestamp: createdAt + 14 * 60 * 1000, // 14 min
        },
      ]);

      const result = await useCase.getMetrics();

      // avg = (6 + 14) / 2 = 10
      expect(result.performance.avgWaitTimeMinutes).toBeCloseTo(10, 5);
    });

    it("should compute avgConsultationTimeMinutes from paired ASSIGNED+COMPLETED events", async () => {
      const createdAt = todayStart;
      const assignedAt = todayStart + 5 * 60 * 1000; // assigned 5 min after creation
      const completedAt = todayStart + 20 * 60 * 1000; // completed 15 min after assignment

      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({
          id: "a1",
          status: "completed",
          timestamp: createdAt,
          completedAt: completedAt,
        }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);
      mockConsumerAuditLog.findTimingEvents.mockResolvedValue([
        {
          appointmentId: "a1",
          action: "APPOINTMENT_ASSIGNED",
          timestamp: assignedAt,
        },
        {
          appointmentId: "a1",
          action: "APPOINTMENT_COMPLETED",
          timestamp: completedAt,
        },
      ]);

      const result = await useCase.getMetrics();

      expect(result.performance.avgWaitTimeMinutes).toBeCloseTo(5, 5);
      expect(result.performance.avgConsultationTimeMinutes).toBeCloseTo(15, 5);
    });

    it("should return null for avgConsultationTimeMinutes when no COMPLETED events exist", async () => {
      const createdAt = todayStart;
      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({ id: "a1", status: "called", timestamp: createdAt }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);
      mockConsumerAuditLog.findTimingEvents.mockResolvedValue([
        {
          appointmentId: "a1",
          action: "APPOINTMENT_ASSIGNED",
          timestamp: createdAt + 8 * 60 * 1000,
        },
      ]);

      const result = await useCase.getMetrics();

      expect(result.performance.avgWaitTimeMinutes).toBeCloseTo(8, 5);
      expect(result.performance.avgConsultationTimeMinutes).toBeNull();
    });

    it("should ignore COMPLETED events with no matching ASSIGNED event today", async () => {
      const createdAt = todayStart;
      const completedAt = todayStart + 30 * 60 * 1000;

      mockQueryAppointments.findAll.mockResolvedValue([
        makeAppointment({
          id: "a1",
          status: "completed",
          timestamp: createdAt,
          completedAt,
        }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);
      // Only COMPLETED, no ASSIGNED in today's window
      mockConsumerAuditLog.findTimingEvents.mockResolvedValue([
        {
          appointmentId: "a1",
          action: "APPOINTMENT_COMPLETED",
          timestamp: completedAt,
        },
      ]);

      const result = await useCase.getMetrics();

      expect(result.performance.avgWaitTimeMinutes).toBeNull();
      expect(result.performance.avgConsultationTimeMinutes).toBeNull();
    });

    it("should ignore audit events with null appointmentId", async () => {
      mockQueryAppointments.findAll.mockResolvedValue([]);
      mockDoctorService.findAll.mockResolvedValue([]);
      mockConsumerAuditLog.findTimingEvents.mockResolvedValue([
        {
          appointmentId: null,
          action: "APPOINTMENT_ASSIGNED",
          timestamp: todayStart + 5000,
        },
      ]);

      const result = await useCase.getMetrics();

      expect(result.performance.avgWaitTimeMinutes).toBeNull();
    });
  });

  describe("getMetrics — completedAt null should not count in completedToday", () => {
    it("should exclude completed appointments with null completedAt", async () => {
      mockQueryAppointments.findAll.mockResolvedValue([
        // status completed but no completedAt — edge case from legacy data
        makeAppointment({
          id: "comp-no-ts",
          status: "completed",
          completedAt: undefined,
        }),
      ]);
      mockDoctorService.findAll.mockResolvedValue([]);

      const result = await useCase.getMetrics();

      expect(result.appointments.completedToday).toBe(0);
    });
  });
});
