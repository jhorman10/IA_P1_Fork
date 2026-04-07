import { Inject, Injectable } from "@nestjs/common";

import { AppointmentView } from "../../domain/models/appointment-view";
import { DoctorView } from "../../domain/models/doctor-view";
import { DoctorServicePort } from "../../domain/ports/inbound/doctor-service.port";
import {
  OPERATIONAL_METRICS_PORT,
  OperationalMetricsPort,
  OperationalMetricsResult,
} from "../../domain/ports/inbound/operational-metrics.port";
import { QueryAppointmentsUseCase } from "../../domain/ports/inbound/query-appointments.use-case";
import {
  CONSUMER_AUDIT_LOG_QUERY_PORT,
  ConsumerAuditLogQueryPort,
  ConsumerAuditTimingEntry,
} from "../../domain/ports/outbound/consumer-audit-log-query.port";

/**
 * SPEC-013: Operational Metrics Use Case
 * Aggregates appointment counts, doctor availability and performance KPIs.
 *
 * avgWaitTimeMinutes  = avg( assignedAt - appointment.timestamp ) for appointments
 *                       assigned today (APPOINTMENT_ASSIGNED events in audit_logs).
 * avgConsultationTimeMinutes = avg( completedAt - assignedAt ) for appointments
 *                       completed today (both events present in audit_logs today).
 *
 * Both values are null when no relevant audit events exist for the current day.
 */
@Injectable()
export class OperationalMetricsUseCaseImpl implements OperationalMetricsPort {
  constructor(
    @Inject("QueryAppointmentsUseCase")
    private readonly queryAppointments: QueryAppointmentsUseCase,
    @Inject("DoctorService")
    private readonly doctorService: DoctorServicePort,
    @Inject(CONSUMER_AUDIT_LOG_QUERY_PORT)
    private readonly consumerAuditLog: ConsumerAuditLogQueryPort,
  ) {}

  async getMetrics(): Promise<OperationalMetricsResult> {
    const nowMs = Date.now();
    const startOfDayUtc = new Date(nowMs);
    startOfDayUtc.setUTCHours(0, 0, 0, 0);
    const startOfDayMs = startOfDayUtc.getTime();

    const [appointments, doctors, timingEvents] = await Promise.all([
      this.queryAppointments.findAll(),
      this.doctorService.findAll(),
      this.consumerAuditLog.findTimingEvents(
        ["APPOINTMENT_ASSIGNED", "APPOINTMENT_COMPLETED"],
        startOfDayMs,
      ),
    ]);

    // Appointment counts — waiting/called are real-time; completedToday is day-scoped
    const appts = appointments as AppointmentView[];
    const waiting = appts.filter((a) => a.status === "waiting").length;
    const called = appts.filter((a) => a.status === "called").length;
    const completedToday = appts.filter(
      (a) =>
        a.status === "completed" &&
        a.completedAt != null &&
        a.completedAt >= startOfDayMs,
    ).length;

    // Doctor counts by status
    const docs = doctors as DoctorView[];
    const available = docs.filter((d) => d.status === "available").length;
    const busy = docs.filter((d) => d.status === "busy").length;
    const offline = docs.filter((d) => d.status === "offline").length;

    // Throughput: completed appointments today / hours elapsed since 00:00 UTC
    const hoursElapsed = (nowMs - startOfDayMs) / (1000 * 60 * 60);
    const throughputPerHour =
      hoursElapsed > 0 ? completedToday / hoursElapsed : 0;

    // Build lookup maps from audit events
    const assignedEvents = (timingEvents as ConsumerAuditTimingEntry[]).filter(
      (e) => e.action === "APPOINTMENT_ASSIGNED",
    );
    const completedEvents = (timingEvents as ConsumerAuditTimingEntry[]).filter(
      (e) => e.action === "APPOINTMENT_COMPLETED",
    );

    // Map appointmentId → creation timestamp (from appointment documents)
    const appointmentCreatedAtMap = new Map(
      appts.map((a) => [a.id, a.timestamp]),
    );

    // avgWaitTimeMinutes: (assignedTs - createdTs) for each assigned event today
    const waitDeltas: number[] = [];
    for (const evt of assignedEvents) {
      if (evt.appointmentId === null) continue;
      const createdAt = appointmentCreatedAtMap.get(evt.appointmentId);
      if (createdAt !== undefined) {
        const deltaMs = evt.timestamp - createdAt;
        if (deltaMs >= 0) waitDeltas.push(deltaMs / (1000 * 60));
      }
    }
    const avgWaitTimeMinutes =
      waitDeltas.length > 0
        ? waitDeltas.reduce((sum, v) => sum + v, 0) / waitDeltas.length
        : null;

    // avgConsultationTimeMinutes: (completedTs - assignedTs) for each pair today
    const assignedTsMap = new Map(
      assignedEvents
        .filter((e) => e.appointmentId !== null)
        .map((e) => [e.appointmentId as string, e.timestamp]),
    );
    const consultDeltas: number[] = [];
    for (const evt of completedEvents) {
      if (evt.appointmentId === null) continue;
      const assignedTs = assignedTsMap.get(evt.appointmentId);
      if (assignedTs !== undefined) {
        const deltaMs = evt.timestamp - assignedTs;
        if (deltaMs >= 0) consultDeltas.push(deltaMs / (1000 * 60));
      }
    }
    const avgConsultationTimeMinutes =
      consultDeltas.length > 0
        ? consultDeltas.reduce((sum, v) => sum + v, 0) / consultDeltas.length
        : null;

    return {
      appointments: { waiting, called, completedToday },
      doctors: { available, busy, offline },
      performance: {
        avgWaitTimeMinutes,
        avgConsultationTimeMinutes,
        throughputPerHour,
      },
      generatedAt: new Date().toISOString(),
    };
  }
}

// Re-export token so module wiring can reference it
export { OPERATIONAL_METRICS_PORT };
