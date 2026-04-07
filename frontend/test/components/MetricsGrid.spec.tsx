// SPEC-013: MetricsGrid component tests
import { render, screen } from "@testing-library/react";

import MetricsGrid from "@/components/MetricsGrid/MetricsGrid";
import { OperationalMetrics } from "@/domain/OperationalMetrics";

function buildMetrics(
  overrides: Partial<OperationalMetrics> = {},
): OperationalMetrics {
  return {
    appointments: { waiting: 5, called: 2, completedToday: 10 },
    doctors: { available: 3, busy: 2, offline: 1 },
    performance: {
      avgWaitTimeMinutes: 8.5,
      avgConsultationTimeMinutes: 12.3,
      throughputPerHour: 4.0,
    },
    generatedAt: "2026-04-05T14:30:00.000Z",
    ...overrides,
  };
}

describe("MetricsGrid", () => {
  it("renders the metrics-grid wrapper", () => {
    render(<MetricsGrid metrics={buildMetrics()} />);

    expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
  });

  it("renders Turnos section with correct values", () => {
    render(<MetricsGrid metrics={buildMetrics()} />);

    expect(screen.getByText("Turnos")).toBeInTheDocument();
    expect(screen.getByText("En espera")).toBeInTheDocument();
    expect(screen.getByText("En atención")).toBeInTheDocument();
    expect(screen.getByText("Completados hoy")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    // "2" appears twice (called=2, busy=2) — confirm at least two exist
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders Médicos section with correct values", () => {
    render(<MetricsGrid metrics={buildMetrics()} />);

    expect(screen.getByText("Médicos")).toBeInTheDocument();
    expect(screen.getByText("Disponibles")).toBeInTheDocument();
    expect(screen.getByText("Ocupados")).toBeInTheDocument();
    expect(screen.getByText("Desconectados")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders Rendimiento section with formatted values", () => {
    render(<MetricsGrid metrics={buildMetrics()} />);

    expect(screen.getByText("Rendimiento")).toBeInTheDocument();
    expect(screen.getByText("8.5 min")).toBeInTheDocument();
    expect(screen.getByText("12.3 min")).toBeInTheDocument();
    expect(screen.getByText("4.0 t/h")).toBeInTheDocument();
  });

  it("shows em-dash for null avgWaitTimeMinutes", () => {
    const metrics = buildMetrics({
      performance: {
        avgWaitTimeMinutes: null,
        avgConsultationTimeMinutes: null,
        throughputPerHour: 0,
      },
    });
    render(<MetricsGrid metrics={metrics} />);

    // Two em-dashes — one for each null duration
    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(2);
    expect(screen.getByText("0.0 t/h")).toBeInTheDocument();
  });

  it("renders nine MetricCard elements total", () => {
    render(<MetricsGrid metrics={buildMetrics()} />);

    expect(screen.getAllByTestId("metric-card")).toHaveLength(9);
  });
});
