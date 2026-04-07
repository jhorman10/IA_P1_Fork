// SPEC-013: MetricCard component tests
import { render, screen } from "@testing-library/react";

import MetricCard, {
  MetricCardProps,
} from "@/components/MetricCard/MetricCard";

function renderCard(overrides: Partial<MetricCardProps> = {}) {
  const props: MetricCardProps = {
    label: "En espera",
    value: 12,
    ...overrides,
  };
  return { ...render(<MetricCard {...props} />), props };
}

describe("MetricCard", () => {
  it("renders label and numeric value", () => {
    renderCard({ label: "En espera", value: 12 });

    expect(screen.getByTestId("metric-label")).toHaveTextContent("En espera");
    expect(screen.getByTestId("metric-value")).toHaveTextContent("12");
  });

  it("renders string value", () => {
    renderCard({ value: "8.5 min" });

    expect(screen.getByTestId("metric-value")).toHaveTextContent("8.5 min");
  });

  it("renders em-dash for null-formatted value", () => {
    renderCard({ value: "—" });

    expect(screen.getByTestId("metric-value")).toHaveTextContent("—");
  });

  it("renders data-testid metric-card on wrapper", () => {
    renderCard();

    expect(screen.getByTestId("metric-card")).toBeInTheDocument();
  });
});
