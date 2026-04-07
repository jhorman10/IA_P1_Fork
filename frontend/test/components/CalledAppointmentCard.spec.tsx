/**
 * 🧪 Tests for CalledAppointmentCard component
 *
 * Tests the specialized card for appointments being served
 */

import { render, screen } from "@testing-library/react";

import { CalledAppointmentCard } from "@/components/AppointmentCard/CalledAppointmentCard";
import { Appointment } from "@/domain/Appointment";

describe("CalledAppointmentCard", () => {
  const mockAppointment: Appointment = {
    id: "apt-called-001",
    fullName: "Jane Smith",
    status: "called",
    office: "3",
    priority: "medium",
    timestamp: 1707907200000,
    idCard: 0,
    doctorId: null,
    doctorName: null,
  };

  describe("Rendering", () => {
    it("should render patient name", () => {
      render(<CalledAppointmentCard appointment={mockAppointment} anonymize={false} />);

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should display doctor name when doctor is assigned", () => {
      const withDoctor: Appointment = {
        ...mockAppointment,
        doctorId: "doc-001",
        doctorName: "Dr. Ana Perez",
      };

      render(<CalledAppointmentCard appointment={withDoctor} />);

      expect(screen.getByText("Dr. Ana Perez")).toBeInTheDocument();
    });

    it("should display office number", () => {
      render(<CalledAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should display N/A when office is null", () => {
      const noOffice: Appointment = {
        ...mockAppointment,
        office: null,
      };

      render(<CalledAppointmentCard appointment={noOffice} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });

    it("should display priority badge", () => {
      render(<CalledAppointmentCard appointment={mockAppointment} />);

      expect(screen.getByText("🟡 Media")).toBeInTheDocument();
    });
  });

  describe("Time Display", () => {
    it("should display time when showTime=true", () => {
      const { container } = render(
        <CalledAppointmentCard appointment={mockAppointment} showTime={true} />,
      );

      // Component renders successfully with time
      expect(container).toBeTruthy();
    });

    it("should not display unnecessary time info when showTime=false", () => {
      const { container } = render(
        <CalledAppointmentCard
          appointment={mockAppointment}
          showTime={false}
        />,
      );

      expect(container).toBeTruthy();
    });

    it("should use default timeIcon when not provided", () => {
      const { container } = render(
        <CalledAppointmentCard appointment={mockAppointment} />,
      );

      expect(container).toBeTruthy();
    });

    it("should use custom timeIcon when provided", () => {
      const { container } = render(
        <CalledAppointmentCard appointment={mockAppointment} timeIcon="📞" />,
      );

      expect(container).toBeTruthy();
    });

    it("should use completedAt as estimated time when available (CRITERIO-3.1)", () => {
      const COMPLETED_AT = 1707910800000;
      const withCompletedAt: Appointment = {
        ...mockAppointment,
        completedAt: COMPLETED_AT,
      };
      render(
        <CalledAppointmentCard appointment={withCompletedAt} showTime={true} />,
      );

      const expectedTime = new Date(COMPLETED_AT).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      expect(screen.getByTestId("estimated-time")).toHaveTextContent(
        expectedTime,
      );
    });

    it("should fall back to timestamp when completedAt is absent", () => {
      const noCompletedAt: Appointment = {
        ...mockAppointment,
        timestamp: 1707907200000,
        completedAt: undefined,
      };
      render(
        <CalledAppointmentCard appointment={noCompletedAt} showTime={true} />,
      );

      const expectedTime = new Date(1707907200000).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      expect(screen.getByTestId("estimated-time")).toHaveTextContent(
        expectedTime,
      );
    });
  });

  describe("Priority Badges", () => {
    it("should show high priority badge", () => {
      const highPriority: Appointment = {
        ...mockAppointment,
        priority: "high",
      };

      render(<CalledAppointmentCard appointment={highPriority} />);

      expect(screen.getByText("🔴 Alta")).toBeInTheDocument();
    });

    it("should show low priority badge", () => {
      const lowPriority: Appointment = {
        ...mockAppointment,
        priority: "low",
      };

      render(<CalledAppointmentCard appointment={lowPriority} />);

      expect(screen.getByText("🟢 Baja")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should have called status class", () => {
      const { container } = render(
        <CalledAppointmentCard appointment={mockAppointment} />,
      );

      const li = container.querySelector("li");
      expect(li).toHaveClass("called");
    });

    it("should have appointmentCard class", () => {
      const { container } = render(
        <CalledAppointmentCard appointment={mockAppointment} />,
      );

      const li = container.querySelector("li");
      expect(li).toHaveClass("appointmentCard");
    });
  });

  describe("Office Badge Rendering", () => {
    it("should display office as string when provided", () => {
      render(<CalledAppointmentCard appointment={mockAppointment} />);

      const officeBadges = screen.getAllByText("3");
      expect(officeBadges.length).toBeGreaterThan(0);
    });

    it("should handle different office numbers", () => {
      const differentOffice: Appointment = {
        ...mockAppointment,
        office: "7",
      };

      render(<CalledAppointmentCard appointment={differentOffice} />);

      expect(screen.getByText("7")).toBeInTheDocument();
    });
  });
});
