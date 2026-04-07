/**
 * 🧪 SPEC-012: Tests for CancelledAppointmentCard component
 */

import { render, screen } from "@testing-library/react";

import { CancelledAppointmentCard } from "@/components/AppointmentCard/CancelledAppointmentCard";
import { Appointment } from "@/domain/Appointment";

const mockAppointment: Appointment = {
  id: "apt-cancelled-001",
  fullName: "Carlos Ramirez",
  status: "cancelled",
  office: null,
  priority: "medium",
  timestamp: Date.now() - 600000,
  idCard: 99999,
  doctorId: null,
  doctorName: null,
};

describe("CancelledAppointmentCard", () => {
  describe("Rendering", () => {
    it("renders patient name when anonymize=false", () => {
      render(
        <CancelledAppointmentCard
          appointment={mockAppointment}
          anonymize={false}
        />,
      );

      expect(screen.getByText("Carlos Ramirez")).toBeInTheDocument();
    });

    it("renders anonymized name by default", () => {
      render(<CancelledAppointmentCard appointment={mockAppointment} />);

      expect(screen.queryByText("Carlos Ramirez")).not.toBeInTheDocument();
      expect(screen.getByText("Carlos R.")).toBeInTheDocument();
    });

    it("renders the cancelled badge", () => {
      render(
        <CancelledAppointmentCard
          appointment={mockAppointment}
          anonymize={false}
        />,
      );

      expect(screen.getByTestId("cancelled-badge")).toBeInTheDocument();
      expect(screen.getByText("❌ Cancelado")).toBeInTheDocument();
    });

    it("renders the card list item", () => {
      render(
        <CancelledAppointmentCard
          appointment={mockAppointment}
          anonymize={false}
        />,
      );

      expect(
        screen.getByTestId("cancelled-appointment-card"),
      ).toBeInTheDocument();
    });

    it("shows medium priority badge", () => {
      render(
        <CancelledAppointmentCard
          appointment={mockAppointment}
          anonymize={false}
        />,
      );

      expect(screen.getByText("🟡 Media")).toBeInTheDocument();
    });

    it("shows high priority badge", () => {
      render(
        <CancelledAppointmentCard
          appointment={{ ...mockAppointment, priority: "high" }}
          anonymize={false}
        />,
      );

      expect(screen.getByText("🔴 Alta")).toBeInTheDocument();
    });

    it("shows low priority badge", () => {
      render(
        <CancelledAppointmentCard
          appointment={{ ...mockAppointment, priority: "low" }}
          anonymize={false}
        />,
      );

      expect(screen.getByText("🟢 Baja")).toBeInTheDocument();
    });

    it("shows dash for office (cancelled appointments have no consultorio)", () => {
      render(
        <CancelledAppointmentCard
          appointment={mockAppointment}
          anonymize={false}
        />,
      );

      expect(screen.getByText("—")).toBeInTheDocument();
    });
  });
});
