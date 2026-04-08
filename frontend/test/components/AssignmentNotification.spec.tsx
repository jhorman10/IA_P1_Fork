/**
 * \ud83e\uddea Tests for AssignmentNotification component (SPEC-003)
 */

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AssignmentNotification } from "@/components/AssignmentNotification/AssignmentNotification";
import { Appointment } from "@/domain/Appointment";

const mockAppointment: Appointment = {
  id: "apt-001",
  fullName: "Carlos Rodríguez",
  idCard: 123456789,
  office: "3",
  timestamp: 1707907200000,
  completedAt: 1707910800000, // 1 hour after timestamp — projected attention time
  status: "called",
  priority: "high",
  doctorId: "doc-001",
  doctorName: "Dr. Juan García",
};

describe("AssignmentNotification", () => {
  describe("Rendering", () => {
    it("should render the notification", () => {
      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={jest.fn()}
        />,
      );
      expect(screen.getByTestId("assignment-notification")).toBeInTheDocument();
    });

    it("should display patient name", () => {
      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={jest.fn()}
          anonymize={false}
        />,
      );
      expect(screen.getByText("Carlos Rodríguez")).toBeInTheDocument();
    });

    it("should display doctor name", () => {
      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={jest.fn()}
        />,
      );
      expect(screen.getByText(/Dr\. Juan García/)).toBeInTheDocument();
    });

    it("should display office", () => {
      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={jest.fn()}
        />,
      );
      expect(screen.getByText(/Consultorio 3/)).toBeInTheDocument();
    });

    it("should show fallback when doctorName is null", () => {
      const noDoctor: Appointment = {
        ...mockAppointment,
        doctorName: null,
      };
      render(
        <AssignmentNotification appointment={noDoctor} onDismiss={jest.fn()} />,
      );
      expect(screen.getByText(/Médico asignado/)).toBeInTheDocument();
    });

    it("should display estimated time when completedAt is set (CRITERIO-3.1)", () => {
      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={jest.fn()}
        />,
      );
      expect(screen.getByTestId("estimated-time")).toBeInTheDocument();
    });

    it("should not display estimated time when completedAt is absent", () => {
      const noEstimate: Appointment = {
        ...mockAppointment,
        completedAt: undefined,
      };
      render(
        <AssignmentNotification
          appointment={noEstimate}
          onDismiss={jest.fn()}
        />,
      );
      expect(screen.queryByTestId("estimated-time")).not.toBeInTheDocument();
    });

    it("should show doctor, office and estimated time together (CRITERIO-3.1)", () => {
      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={jest.fn()}
        />,
      );
      expect(screen.getByText(/Dr\. Juan García/)).toBeInTheDocument();
      expect(screen.getByText(/Consultorio 3/)).toBeInTheDocument();
      expect(screen.getByTestId("estimated-time")).toBeInTheDocument();
    });
  });

  describe("Dismiss", () => {
    it("should call onDismiss when close button is clicked", async () => {
      const onDismiss = jest.fn();
      const user = userEvent.setup();

      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={onDismiss}
        />,
      );

      const closeBtn = screen.getByRole("button", {
        name: /cerrar notificación/i,
      });
      await user.click(closeBtn);

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe("Auto-dismiss", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should call onDismiss after 8 seconds", () => {
      const onDismiss = jest.fn();

      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={onDismiss}
        />,
      );

      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(8000);
      });

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    it("should have role=alert", () => {
      render(
        <AssignmentNotification
          appointment={mockAppointment}
          onDismiss={jest.fn()}
        />,
      );
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
