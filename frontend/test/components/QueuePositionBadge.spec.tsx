/**
 * \ud83e\uddea Tests for QueuePositionBadge component (SPEC-003)
 */

import { render, screen } from "@testing-library/react";

import { QueuePositionBadge } from "@/components/QueuePositionBadge/QueuePositionBadge";

describe("QueuePositionBadge", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("should render position and total", () => {
    render(<QueuePositionBadge position={3} total={7} />);
    const badge = screen.getByLabelText("Posición 3 de 7");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Pos. 3 / 7");
  });

  it("should have correct aria-label", () => {
    render(<QueuePositionBadge position={1} total={5} />);
    expect(screen.getByLabelText("Posición 1 de 5")).toBeInTheDocument();
  });

  it("should display position 1 of 1", () => {
    render(<QueuePositionBadge position={1} total={1} />);
    expect(screen.getByLabelText("Posición 1 de 1")).toHaveTextContent(
      "Pos. 1 / 1",
    );
  });

  it("should keep badge semantics in dark mode", () => {
    document.documentElement.setAttribute("data-theme", "dark");

    render(<QueuePositionBadge position={2} total={8} />);

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(screen.getByTestId("queue-position-badge")).toBeInTheDocument();
    expect(screen.getByLabelText("Posición 2 de 8")).toBeInTheDocument();
  });
});
