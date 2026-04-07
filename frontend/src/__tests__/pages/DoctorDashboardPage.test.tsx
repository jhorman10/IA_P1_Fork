import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DoctorDashboardPage from "@/app/doctor/dashboard/page";
import { Doctor } from "@/domain/Doctor";
import { Profile } from "@/domain/Profile";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";
import {
  useAvailableOffices,
  UseAvailableOfficesReturn,
} from "@/hooks/useAvailableOffices";
import {
  useDoctorDashboard,
  UseDoctorDashboardReturn,
} from "@/hooks/useDoctorDashboard";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useDoctorDashboard", () => ({
  useDoctorDashboard: jest.fn(),
}));

jest.mock("@/hooks/useAvailableOffices", () => ({
  useAvailableOffices: jest.fn(),
}));

jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
  useAppointmentsWebSocket: jest.fn(),
}));

import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseDoctorDashboard = useDoctorDashboard as jest.MockedFunction<
  typeof useDoctorDashboard
>;
const mockUseAvailableOffices = useAvailableOffices as jest.MockedFunction<
  typeof useAvailableOffices
>;
const mockUseAppointmentsWebSocket =
  useAppointmentsWebSocket as jest.MockedFunction<
    typeof useAppointmentsWebSocket
  >;

function buildDoctorProfile(doctorId: string | null = "doc-1"): Profile {
  return {
    uid: "uid-doc",
    email: "doctor@clinic.local",
    display_name: "Dr. Torres",
    role: "doctor",
    status: "active",
    doctor_id: doctorId,
  };
}

function buildDoctor(overrides: Partial<Doctor> = {}): Doctor {
  return {
    id: "doc-1",
    name: "Dr. Torres",
    specialty: "General",
    office: null,
    status: "offline",
    ...overrides,
  };
}

function buildUseAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: buildDoctorProfile(),
    token: "token-doc",
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

function buildUseDoctorDashboardReturn(
  overrides: Partial<UseDoctorDashboardReturn> = {},
): UseDoctorDashboardReturn {
  return {
    doctor: buildDoctor(),
    loading: false,
    error: null,
    successMessage: null,
    checkIn: jest.fn().mockResolvedValue(undefined),
    checkOut: jest.fn().mockResolvedValue(undefined),
    completeCurrentAppointment: jest.fn().mockResolvedValue(undefined),
    refetch: jest.fn(),
    ...overrides,
  };
}

function buildAvailableOfficesReturn(
  overrides: Partial<UseAvailableOfficesReturn> = {},
): UseAvailableOfficesReturn {
  return {
    offices: ["1", "3"],
    loading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("DoctorDashboardPage SPEC-016 behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
    mockUseDoctorDashboard.mockReturnValue(buildUseDoctorDashboardReturn());
    mockUseAvailableOffices.mockReturnValue(buildAvailableOfficesReturn());
    mockUseAppointmentsWebSocket.mockReturnValue({
      appointments: [],
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    });
  });

  it("shows no-offices message when there are no enabled free offices", () => {
    mockUseAvailableOffices.mockReturnValue(
      buildAvailableOfficesReturn({ offices: [] }),
    );

    render(<DoctorDashboardPage />);

    expect(screen.getByTestId("no-offices-message")).toBeInTheDocument();
    expect(screen.queryByTestId("office-select")).not.toBeInTheDocument();
  });

  it("refetches available offices after check-in attempt with conflict", async () => {
    const user = userEvent.setup();
    const checkIn = jest.fn().mockResolvedValue(undefined);
    const refetchOffices = jest.fn();

    mockUseDoctorDashboard.mockReturnValue(
      buildUseDoctorDashboardReturn({
        doctor: buildDoctor({ status: "offline" }),
        checkIn,
        error: "HTTP_ERROR: 409",
      }),
    );

    mockUseAvailableOffices.mockReturnValue(
      buildAvailableOfficesReturn({
        offices: ["1", "3"],
        refetch: refetchOffices,
      }),
    );

    render(<DoctorDashboardPage />);

    await user.selectOptions(screen.getByTestId("office-select"), "3");
    await user.click(screen.getByTestId("btn-confirm-checkin"));

    await waitFor(() => expect(checkIn).toHaveBeenCalledWith("3"));
    await waitFor(() => expect(refetchOffices).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("dashboard-error")).toHaveTextContent(
      "HTTP_ERROR: 409",
    );
  });
});
