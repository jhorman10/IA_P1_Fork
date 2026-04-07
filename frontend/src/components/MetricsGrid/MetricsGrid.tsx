"use client";

// SPEC-013: MetricsGrid — organizes MetricCards into sections
import MetricCard from "@/components/MetricCard/MetricCard";
import { OperationalMetrics } from "@/domain/OperationalMetrics";

import styles from "./MetricsGrid.module.css";

export interface MetricsGridProps {
  metrics: OperationalMetrics;
}

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  return `${minutes.toFixed(1)} min`;
}

function formatThroughput(throughput: number): string {
  return `${throughput.toFixed(1)} t/h`;
}

export default function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div data-testid="metrics-grid">
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Turnos</h2>
        <div className={styles.grid}>
          <MetricCard
            label="En espera"
            value={metrics.appointments.waiting}
            variant="warning"
          />
          <MetricCard
            label="En atención"
            value={metrics.appointments.called}
            variant="default"
          />
          <MetricCard
            label="Completados hoy"
            value={metrics.appointments.completedToday}
            variant="success"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Médicos</h2>
        <div className={styles.grid}>
          <MetricCard
            label="Disponibles"
            value={metrics.doctors.available}
            variant="success"
          />
          <MetricCard
            label="Ocupados"
            value={metrics.doctors.busy}
            variant="warning"
          />
          <MetricCard
            label="Desconectados"
            value={metrics.doctors.offline}
            variant="muted"
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rendimiento</h2>
        <div className={styles.grid}>
          <MetricCard
            label="Tiempo prom. espera"
            value={formatDuration(metrics.performance.avgWaitTimeMinutes)}
          />
          <MetricCard
            label="Tiempo prom. consulta"
            value={formatDuration(
              metrics.performance.avgConsultationTimeMinutes,
            )}
          />
          <MetricCard
            label="Turnos por hora"
            value={formatThroughput(metrics.performance.throughputPerHour)}
          />
        </div>
      </section>
    </div>
  );
}
