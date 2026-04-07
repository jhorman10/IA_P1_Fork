/**
 * SPEC-013: Operational Metrics Port — inbound interface for the metrics use case.
 */
export interface OperationalMetricsResult {
  appointments: {
    waiting: number;
    called: number;
    completedToday: number;
  };
  doctors: {
    available: number;
    busy: number;
    offline: number;
  };
  performance: {
    avgWaitTimeMinutes: number | null;
    avgConsultationTimeMinutes: number | null;
    throughputPerHour: number;
  };
  generatedAt: string;
}

export const OPERATIONAL_METRICS_PORT = "OperationalMetricsPort";

export interface OperationalMetricsPort {
  getMetrics(): Promise<OperationalMetricsResult>;
}
