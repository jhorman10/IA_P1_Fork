// SPEC-013: OperationalMetrics domain type — reflects GET /metrics response shape

export interface OperationalMetrics {
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
