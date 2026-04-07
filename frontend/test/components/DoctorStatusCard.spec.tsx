// SPEC-008: DoctorStatusCard component tests
// SPEC-015: office selector integration (OfficeSelector replaces check-in button)
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DoctorStatusCard, {
  DoctorStatusCardProps,
} from "@/components/DoctorStatusCard/DoctorStatusCard";
import { Doctor } from "@/domain/Doctor";

function buildDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: "doc-1",
    name: "Dr. Torres",
    specialty: "General",
    office: "A1",
    status: "offline",
    ...overrides,
  };
}

function renderCard(overrides: Partial<DoctorStatusCardProps> = {}) {
  const props: DoctorStatusCardProps = {
    doctor: buildDoctor(),
    onCheckIn: jest.fn(),
    onCheckOut: jest.fn(),
    loading: false,
    availableOffices: ["1", "2", "3"],
    officesLoading: false,
    ...overrides,
  };
  return { ...render(<DoctorStatusCard {...props} />), props };
}

describe("DoctorStatusCard", () => {
  it("renders doctor name, office and specialty", () => {
    renderCard({
      doctor: buildDoctor({
        name: "Dra. Gomez",
        office: "B2",
        specialty: "Pediatria",
      }),
    });

    expect(screen.getByText("Dra. Gomez")).toBeInTheDocument();
    expect(screen.getByText("Consultorio B2")).toBeInTheDocument();
    expect(screen.getByText("Pediatria")).toBeInTheDocument();
  });

  it("shows 'Sin consultorio asignado' when office is null", () => {
    renderCard({ doctor: buildDoctor({ office: null, status: "offline" }) });
    expect(screen.getByText("Sin consultorio asignado")).toBeInTheDocument();
  });

  it("shows status badge 'Fuera de consultorio' when offline", () => {
    renderCard({ doctor: buildDoctor({ status: "offline" }) });
    expect(screen.getByTestId("doctor-status-badge")).toHaveTextContent(
      "Fuera de consultorio",
    );
  });

  it("shows status badge 'Disponible' when available", () => {
    renderCard({ doctor: buildDoctor({ status: "available" }) });
    expect(screen.getByTestId("doctor-status-badge")).toHaveTextContent(
      "Disponible",
    );
  });

  it("shows status badge 'En atencion' when busy", () => {
    renderCard({ doctor: buildDoctor({ status: "busy" }) });
    expect(screen.getByTestId("doctor-status-badge")).toHaveTextContent(
      "En atencion",
    );
  });

  describe("OfficeSelector — shown when status is offline", () => {
    it("renders OfficeSelector with available offices", () => {
      renderCard({
        doctor: buildDoctor({ status: "offline" }),
        availableOffices: ["2", "4"],
      });
      expect(screen.getByTestId("office-selector")).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Consultorio 2" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Consultorio 4" }),
      ).toBeInTheDocument();
    });

    it("shows no-offices message when availableOffices is empty", () => {
      renderCard({
        doctor: buildDoctor({ status: "offline" }),
        availableOffices: [],
        officesLoading: false,
      });
      expect(screen.getByTestId("no-offices-message")).toBeInTheDocument();
      expect(
        screen.queryByTestId("btn-confirm-checkin"),
      ).not.toBeInTheDocument();
    });

    it("shows loading indicator when officesLoading is true", () => {
      renderCard({
        doctor: buildDoctor({ status: "offline" }),
        officesLoading: true,
      });
      expect(screen.getByTestId("offices-loading")).toBeInTheDocument();
    });

    it("confirm button is disabled until an office is selected", () => {
      renderCard({
        doctor: buildDoctor({ status: "offline" }),
        availableOffices: ["3"],
      });
      expect(screen.getByTestId("btn-confirm-checkin")).toBeDisabled();
    });

    it("calls onCheckIn with selected office after confirm", async () => {
      const user = userEvent.setup();
      const onCheckIn = jest.fn();
      renderCard({
        doctor: buildDoctor({ status: "offline" }),
        availableOffices: ["1", "3"],
        onCheckIn,
      });

      await user.selectOptions(screen.getByTestId("office-select"), "3");
      await user.click(screen.getByTestId("btn-confirm-checkin"));

      expect(onCheckIn).toHaveBeenCalledWith("3");
    });

    it("confirm button is disabled when loading is true", () => {
      renderCard({
        doctor: buildDoctor({ status: "offline" }),
        availableOffices: ["1"],
        loading: true,
      });
      expect(screen.getByTestId("btn-confirm-checkin")).toBeDisabled();
    });
  });

  describe("check-out button behaviour", () => {
    it("is enabled when status is available", () => {
      renderCard({ doctor: buildDoctor({ status: "available", office: "2" }) });
      expect(screen.getByTestId("btn-check-out")).not.toBeDisabled();
    });

    it("is enabled when status is busy (backend enforces restriction)", () => {
      renderCard({ doctor: buildDoctor({ status: "busy", office: "2" }) });
      expect(screen.getByTestId("btn-check-out")).not.toBeDisabled();
    });

    it("is not visible when status is offline (OfficeSelector shown instead)", () => {
      renderCard({ doctor: buildDoctor({ status: "offline" }) });
      expect(screen.queryByTestId("btn-check-out")).not.toBeInTheDocument();
    });

    it("is disabled when loading is true", () => {
      renderCard({
        doctor: buildDoctor({ status: "available", office: "2" }),
        loading: true,
      });
      expect(screen.getByTestId("btn-check-out")).toBeDisabled();
    });

    it("calls onCheckOut when clicked", async () => {
      const user = userEvent.setup();
      const onCheckOut = jest.fn();
      renderCard({
        doctor: buildDoctor({ status: "available", office: "2" }),
        onCheckOut,
      });

      await user.click(screen.getByTestId("btn-check-out"));

      expect(onCheckOut).toHaveBeenCalledTimes(1);
    });
  });
});
