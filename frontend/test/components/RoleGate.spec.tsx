import { render, screen } from "@testing-library/react";

import RoleGate from "@/components/RoleGate/RoleGate";
import { Profile } from "@/domain/Profile";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function buildAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: null,
    token: null,
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
    ...overrides,
  };
}

describe("RoleGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("renders children when role is authorized", () => {
    const profile: Profile = {
      uid: "uid-1",
      email: "recepcion@clinic.local",
      display_name: "Recepción",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    };

    mockUseAuth.mockReturnValue(buildAuthReturn({ profile }));

    render(
      <RoleGate roles={["admin", "recepcionista"]}>
        <p>Contenido protegido</p>
      </RoleGate>,
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    expect(screen.queryByTestId("role-gate-blocked")).not.toBeInTheDocument();
  });

  it("blocks unauthorized role and shows default message", () => {
    const profile: Profile = {
      uid: "uid-2",
      email: "doctor@clinic.local",
      display_name: "Doctor",
      role: "doctor",
      status: "active",
      doctor_id: "doctor-1",
    };

    mockUseAuth.mockReturnValue(buildAuthReturn({ profile }));

    render(
      <RoleGate roles={["admin", "recepcionista"]}>
        <p>Contenido protegido</p>
      </RoleGate>,
    );

    expect(screen.getByTestId("role-gate-blocked")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "No tienes permisos para acceder a esta sección.",
    );
    expect(screen.queryByText("Contenido protegido")).not.toBeInTheDocument();
  });

  it("renders fallback instead of default block message when provided", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn({ profile: null }));

    render(
      <RoleGate roles={["admin"]} fallback={<p>Sin acceso</p>}>
        <p>Contenido protegido</p>
      </RoleGate>,
    );

    expect(screen.getByText("Sin acceso")).toBeInTheDocument();
    expect(screen.queryByTestId("role-gate-blocked")).not.toBeInTheDocument();
  });
});
