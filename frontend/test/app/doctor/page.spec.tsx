// SPEC-008: DoctorDashboardPage tests
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DoctorDashboardPage from "@/app/doctor/dashboard/page";
import { Appointment } from "@/domain/Appointment";
import { Doctor } from "@/domain/Doctor";
import { Profile } from "@/domain/Profile";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { UseAuthReturn } from "@/hooks/useAuth";
import { useAvailableOffices } from "@/hooks/useAvailableOffices";
import { UseDoctorDashboardReturn } from "@/hooks/useDoctorDashboard";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useDoctorDashboard", () => ({
  useDoctorDashboard: jest.fn(),
}));

jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
  useAppointmentsWebSocket: jest.fn(),
}));

jest.mock("@/hooks/useAvailableOffices", () => ({
  useAvailableOffices: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
import { useDoctorDashboard } from "@/hooks/useDoctorDashboard";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseAvailableOffices = useAvailableOffices as jest.MockedFunction<
  typeof useAvailableOffices
>;
const mockUseDoctorDashboard = useDoctorDashboard as jest.MockedFunction<
  typeof useDoctorDashboard
>;
const mockUseAppointmentsWebSocket =
  useAppointmentsWebSocket as jest.MockedFunction<
    typeof useAppointmentsWebSocket
  >;

function buildDoctorProfile(doctor_id: string | null = "doc-1"): Profile {
  return {
    uid: "uid-doc",
    email: "doctor@clinic.local",
    display_name: "Dr. Torres",
    role: "doctor",
    status: "active",
    doctor_id,
  };
}

function buildAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: buildDoctorProfile(),
    token: "test-token",
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

function buildDashboardReturn(
  overrides: Partial<UseDoctorDashboardReturn> = {},
): UseDoctorDashboardReturn {
  return {
    doctor: null,
    loading: false,
    error: null,
    successMessage: null,
    checkIn: jest.fn(),
    checkOut: jest.fn(),
    completeCurrentAppointment: jest.fn(),
    refetch: jest.fn(),
    ...overrides,
  };
}

function buildAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "apt-001",
    fullName: "Paciente Uno",
    idCard: 123456,
    office: "1",
    status: "called",
    priority: "medium",
    timestamp: Date.now(),
    doctorId: "doc-1",
    doctorName: "Dr. Torres",
    ...overrides,
  };
}

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

describe("DoctorDashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
    mockUseAvailableOffices.mockReturnValue({
      offices: ["A1", "A2"],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    mockUseDoctorDashboard.mockReturnValue(buildDashboardReturn());
    mockUseAppointmentsWebSocket.mockReturnValue({
      appointments: [],
      error: null,
      connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
    });
  });

  it("blocks non-doctor role via RoleGate", () => {
    const adminProfile: Profile = {
      uid: "uid-admin",
      email: "admin@clinic.local",
      display_name: "Admin",
      role: "admin",
      status: "active",
      doctor_id: null,
    };
    mockUseAuth.mockReturnValue(buildAuthReturn({ profile: adminProfile }));

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("role-gate-blocked")).toBeInTheDocument();
    expect(screen.queryByText("Panel del Doctor")).not.toBeInTheDocument();
  });

  it("blocks recepcionista role via RoleGate", () => {
    const recepProfile: Profile = {
      uid: "uid-recep",
      email: "recep@clinic.local",
      display_name: "Recep",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    };
    mockUseAuth.mockReturnValue(buildAuthReturn({ profile: recepProfile }));

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("role-gate-blocked")).toBeInTheDocument();
  });

  it("renders heading and welcome message for authenticated doctor", () => {
    render(<DoctorDashboardPage />);

    expect(screen.getByText("Panel del Doctor")).toBeInTheDocument();
    expect(screen.getByText(/Bienvenido.*Dr. Torres/i)).toBeInTheDocument();
  });

  it("shows DoctorStatusCard when doctor data is loaded", () => {
    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({ doctor: buildDoctor() }),
    );

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("doctor-status-card")).toBeInTheDocument();
    expect(screen.getByText("Dr. Torres")).toBeInTheDocument();
  });

  it("wires check-in action from card to hook checkIn", async () => {
    const user = userEvent.setup();
    const checkIn = jest.fn();
    const checkOut = jest.fn();

    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({
        doctor: buildDoctor({ status: "offline" }),
        checkIn,
        checkOut,
      }),
    );

    render(<DoctorDashboardPage />);

    await user.selectOptions(screen.getByTestId("office-select"), "A1");
    await user.click(screen.getByTestId("btn-confirm-checkin"));

    expect(checkIn).toHaveBeenCalledWith("A1");
    expect(checkOut).not.toHaveBeenCalled();
  });

  it("refetches available offices after check-in conflict (SPEC-016 CRITERIO-3.4)", async () => {
    const user = userEvent.setup();
    const checkIn = jest.fn().mockResolvedValue(undefined);
    const refetchOffices = jest.fn();

    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({
        doctor: buildDoctor({ status: "offline" }),
        checkIn,
        error: "HTTP_ERROR: 409",
      }),
    );

    mockUseAvailableOffices.mockReturnValue({
      offices: ["A1", "A2"],
      loading: false,
      error: null,
      refetch: refetchOffices,
    });

    render(<DoctorDashboardPage />);

    await user.selectOptions(screen.getByTestId("office-select"), "A2");
    await user.click(screen.getByTestId("btn-confirm-checkin"));

    expect(checkIn).toHaveBeenCalledWith("A2");
    expect(refetchOffices).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("dashboard-error")).toHaveTextContent(
      "HTTP_ERROR: 409",
    );
  });

  it("wires check-out action from card to hook checkOut", async () => {
    const user = userEvent.setup();
    const checkIn = jest.fn();
    const checkOut = jest.fn();

    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({
        doctor: buildDoctor({ status: "available" }),
        checkIn,
        checkOut,
      }),
    );

    render(<DoctorDashboardPage />);

    await user.click(screen.getByTestId("btn-check-out"));

    expect(checkOut).toHaveBeenCalledTimes(1);
    expect(checkIn).not.toHaveBeenCalled();
  });

  it("shows loading indicator while initial fetch is in progress", () => {
    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({ loading: true, doctor: null }),
    );

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("dashboard-loading")).toBeInTheDocument();
  });

  it("shows error message when hook exposes an error", () => {
    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({
        error: "Perfil no vinculado a un medico. Contacte al administrador.",
      }),
    );

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("dashboard-error")).toHaveTextContent(
      "Perfil no vinculado a un medico.",
    );
  });

  it("does not show DoctorStatusCard when doctor is null", () => {
    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({ doctor: null }),
    );

    render(<DoctorDashboardPage />);

    expect(screen.queryByTestId("doctor-status-card")).not.toBeInTheDocument();
  });

  it("shows success confirmation when successMessage is set (CRITERIO-1.2/1.3)", () => {
    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({
        doctor: buildDoctor({ status: "available" }),
        successMessage: "Check-in realizado correctamente",
      }),
    );

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("dashboard-success")).toHaveTextContent(
      "Check-in realizado correctamente",
    );
  });

  it("shows busy check-out business error message (CRITERIO-1.4)", () => {
    mockUseDoctorDashboard.mockReturnValue(
      buildDashboardReturn({
        doctor: buildDoctor({ status: "busy" }),
        error: "Tiene un paciente asignado, no puede salir del consultorio",
      }),
    );

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("dashboard-error")).toHaveTextContent(
      "Tiene un paciente asignado, no puede salir del consultorio",
    );
    expect(screen.queryByTestId("dashboard-success")).not.toBeInTheDocument();
  });

  describe("SPEC-012: complete current appointment", () => {
    it("shows no-current-patient message when doctor has no called appointment", () => {
      render(<DoctorDashboardPage />);

      expect(screen.getByTestId("no-current-patient")).toBeInTheDocument();
      expect(
        screen.queryByTestId("btn-complete-appointment"),
      ).not.toBeInTheDocument();
    });

    it("renders current patient info and complete button when called appointment exists", () => {
      mockUseAppointmentsWebSocket.mockReturnValue({
        appointments: [buildAppointment()],
        error: null,
        connected: true,
        isConnecting: false,
        connectionStatus: "connected",
      });

      render(<DoctorDashboardPage />);

      expect(screen.getByTestId("current-patient-info")).toBeInTheDocument();
      expect(screen.getByText("Paciente Uno")).toBeInTheDocument();
      expect(
        screen.getByTestId("btn-complete-appointment"),
      ).toBeInTheDocument();
    });

    it("wires complete button click to completeCurrentAppointment with appointment id", async () => {
      const user = userEvent.setup();
      const completeCurrentAppointment = jest.fn();

      mockUseDoctorDashboard.mockReturnValue(
        buildDashboardReturn({
          doctor: buildDoctor({ status: "busy" }),
          completeCurrentAppointment,
        }),
      );
      mockUseAppointmentsWebSocket.mockReturnValue({
        appointments: [buildAppointment({ id: "apt-777" })],
        error: null,
        connected: true,
        isConnecting: false,
        connectionStatus: "connected",
      });

      render(<DoctorDashboardPage />);

      await user.click(screen.getByTestId("btn-complete-appointment"));

      expect(completeCurrentAppointment).toHaveBeenCalledWith("apt-777");
      expect(completeCurrentAppointment).toHaveBeenCalledTimes(1);
    });

    it("disables complete button and shows processing label while loading", () => {
      mockUseDoctorDashboard.mockReturnValue(
        buildDashboardReturn({
          doctor: buildDoctor({ status: "busy" }),
          loading: true,
        }),
      );
      mockUseAppointmentsWebSocket.mockReturnValue({
        appointments: [buildAppointment()],
        error: null,
        connected: true,
        isConnecting: false,
        connectionStatus: "connected",
      });

      render(<DoctorDashboardPage />);

      const btn = screen.getByTestId("btn-complete-appointment");
      expect(btn).toBeDisabled();
      expect(btn).toHaveTextContent("Procesando...");
    });
  });
});
