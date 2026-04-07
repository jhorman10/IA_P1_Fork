// SPEC-013: AdminDashboardPage integration tests
import { render, screen } from "@testing-library/react";

import AdminDashboardPage from "@/app/admin/dashboard/page";
import { OperationalMetrics } from "@/domain/OperationalMetrics";
import { Profile } from "@/domain/Profile";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";
import {
  useOperationalMetrics,
  UseOperationalMetricsReturn,
} from "@/hooks/useOperationalMetrics";
import { useRoleGuard, UseRoleGuardReturn } from "@/hooks/useRoleGuard";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useRoleGuard", () => ({
  useRoleGuard: jest.fn(),
}));

jest.mock("@/hooks/useOperationalMetrics", () => ({
  useOperationalMetrics: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRoleGuard = useRoleGuard as jest.MockedFunction<
  typeof useRoleGuard
>;
const mockUseMetrics = useOperationalMetrics as jest.MockedFunction<
  typeof useOperationalMetrics
>;

const adminProfile: Profile = {
  uid: "admin-uid",
  email: "admin@clinic.local",
  display_name: "Admin Central",
  role: "admin",
  status: "active",
  doctor_id: null,
};

const sampleMetrics: OperationalMetrics = {
  appointments: { waiting: 5, called: 2, completedToday: 10 },
  doctors: { available: 3, busy: 2, offline: 1 },
  performance: {
    avgWaitTimeMinutes: 8.5,
    avgConsultationTimeMinutes: 12.3,
    throughputPerHour: 4.0,
  },
  generatedAt: "2026-04-05T14:30:00.000Z",
};

function buildUseAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: adminProfile,
    token: "token-123",
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildRoleGuardReturn(
  overrides: Partial<UseRoleGuardReturn> = {},
): UseRoleGuardReturn {
  return {
    allowed: true,
    redirectTo: "/login",
    ...overrides,
  };
}

function buildMetricsReturn(
  overrides: Partial<UseOperationalMetricsReturn> = {},
): UseOperationalMetricsReturn {
  return {
    metrics: sampleMetrics,
    loading: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn());
    mockUseMetrics.mockReturnValue(buildMetricsReturn());
  });

  it("hides content when role guard denies access", () => {
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn({ allowed: false }));

    render(<AdminDashboardPage />);

    expect(screen.queryByText("Dashboard Operativo")).not.toBeInTheDocument();
  });

  it("renders heading and welcome message for admin", () => {
    render(<AdminDashboardPage />);

    expect(mockUseRoleGuard).toHaveBeenCalledWith(["admin"]);
    expect(screen.getByText("Dashboard Operativo")).toBeInTheDocument();
    expect(screen.getByText("Bienvenido, Admin Central")).toBeInTheDocument();
  });

  it("uses display_name when available", () => {
    render(<AdminDashboardPage />);

    expect(screen.getByText("Bienvenido, Admin Central")).toBeInTheDocument();
  });

  it("falls back to email when display_name is null", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: { ...adminProfile, display_name: null as unknown as string },
      }),
    );

    render(<AdminDashboardPage />);

    expect(
      screen.getByText("Bienvenido, admin@clinic.local"),
    ).toBeInTheDocument();
  });

  it("renders MetricsGrid when metrics are loaded", () => {
    render(<AdminDashboardPage />);

    expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
  });

  it("shows loading text when loading and no metrics yet", () => {
    mockUseMetrics.mockReturnValue(
      buildMetricsReturn({ metrics: null, loading: true }),
    );

    render(<AdminDashboardPage />);

    expect(screen.getByText("Cargando métricas…")).toBeInTheDocument();
  });

  it("shows error alert when fetch fails", () => {
    mockUseMetrics.mockReturnValue(
      buildMetricsReturn({ error: "HTTP_ERROR: 500" }),
    );

    render(<AdminDashboardPage />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("HTTP_ERROR: 500");
  });

  it("shows empty state when not loading, no metrics, and no error", () => {
    mockUseMetrics.mockReturnValue(
      buildMetricsReturn({ metrics: null, loading: false, error: null }),
    );

    render(<AdminDashboardPage />);

    expect(screen.getByText("Sin datos disponibles.")).toBeInTheDocument();
  });

  it("preserves metrics grid alongside error on refresh failure", () => {
    mockUseMetrics.mockReturnValue(
      buildMetricsReturn({ error: "HTTP_ERROR: 503" }),
    );

    render(<AdminDashboardPage />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByTestId("metrics-grid")).toBeInTheDocument();
  });
});
