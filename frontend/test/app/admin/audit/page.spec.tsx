import { fireEvent, render, screen, within } from "@testing-library/react";

import AdminAuditPage from "@/app/admin/audit/page";
import { AuditLogEntry } from "@/domain/AuditLog";
import { Profile } from "@/domain/Profile";
import { useAuditLogs, UseAuditLogsReturn } from "@/hooks/useAuditLogs";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";
import { useRoleGuard, UseRoleGuardReturn } from "@/hooks/useRoleGuard";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useRoleGuard", () => ({
  useRoleGuard: jest.fn(),
}));

jest.mock("@/hooks/useAuditLogs", () => ({
  useAuditLogs: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRoleGuard = useRoleGuard as jest.MockedFunction<
  typeof useRoleGuard
>;
const mockUseAuditLogs = useAuditLogs as jest.MockedFunction<
  typeof useAuditLogs
>;

const adminProfile: Profile = {
  uid: "admin-uid",
  email: "admin@clinic.local",
  display_name: "Admin Central",
  role: "admin",
  status: "active",
  doctor_id: null,
};

const sampleEntry: AuditLogEntry = {
  id: "log-1",
  action: "PROFILE_CREATED",
  actorUid: "uid-admin",
  targetUid: "uid-target",
  targetId: null,
  details: { role: "recepcionista" },
  timestamp: 1712345678000,
  createdAt: "2026-04-05T14:21:18.000Z",
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

function buildAuditLogsReturn(
  overrides: Partial<UseAuditLogsReturn> = {},
): UseAuditLogsReturn {
  return {
    logs: [sampleEntry],
    total: 25,
    page: 1,
    totalPages: 2,
    loading: false,
    error: null,
    filters: {},
    setFilters: jest.fn(),
    fetchLogs: jest.fn(),
    ...overrides,
  };
}

describe("AdminAuditPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn());
    mockUseAuditLogs.mockReturnValue(buildAuditLogsReturn());
  });

  it("hides audit content when role guard denies access", () => {
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn({ allowed: false }));

    render(<AdminAuditPage />);

    expect(
      screen.queryByText("Trazabilidad Operativa"),
    ).not.toBeInTheDocument();
  });

  it("renders audit page content for admin users", () => {
    render(<AdminAuditPage />);

    expect(mockUseRoleGuard).toHaveBeenCalledWith(["admin"]);
    expect(screen.getByText("Trazabilidad Operativa")).toBeInTheDocument();
    expect(screen.getByText("Bienvenido, Admin Central")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("audit-log-table")).getByText(
        "PROFILE_CREATED",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("uid-admin")).toBeInTheDocument();
  });

  it("shows error alert when hook returns an error", () => {
    mockUseAuditLogs.mockReturnValue(
      buildAuditLogsReturn({
        logs: [],
        total: 0,
        totalPages: 1,
        error: "HTTP_ERROR: 403",
      }),
    );

    render(<AdminAuditPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("HTTP_ERROR: 403");
  });

  it("wires filter changes to setFilters", () => {
    const setFilters = jest.fn();
    mockUseAuditLogs.mockReturnValue(buildAuditLogsReturn({ setFilters }));

    render(<AdminAuditPage />);

    fireEvent.change(screen.getByLabelText(/Acci.n/i), {
      target: { value: "DOCTOR_CHECK_IN" },
    });

    expect(setFilters).toHaveBeenCalledWith({ action: "DOCTOR_CHECK_IN" });
  });

  it("wires next-page action to fetchLogs", () => {
    const fetchLogs = jest.fn();
    mockUseAuditLogs.mockReturnValue(buildAuditLogsReturn({ fetchLogs }));

    render(<AdminAuditPage />);

    fireEvent.click(screen.getByText(/Siguiente/i));

    expect(fetchLogs).toHaveBeenCalledWith(2);
  });
});
