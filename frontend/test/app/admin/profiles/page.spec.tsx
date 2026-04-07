import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import AdminProfilesPage from "@/app/admin/profiles/page";
import { Office } from "@/domain/Office";
import { Profile } from "@/domain/Profile";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";
import {
  useOfficeCatalog,
  UseOfficeCatalogReturn,
} from "@/hooks/useOfficeCatalog";
import { useProfiles, UseProfilesReturn } from "@/hooks/useProfiles";
import { useRoleGuard, UseRoleGuardReturn } from "@/hooks/useRoleGuard";
import { useSpecialties, UseSpecialtiesReturn } from "@/hooks/useSpecialties";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/useProfiles", () => ({
  useProfiles: jest.fn(),
}));

jest.mock("@/hooks/useRoleGuard", () => ({
  useRoleGuard: jest.fn(),
}));

jest.mock("@/hooks/useSpecialties", () => ({
  useSpecialties: jest.fn(),
}));

jest.mock("@/hooks/useOfficeCatalog", () => ({
  useOfficeCatalog: jest.fn(),
}));

jest.mock("@/components/ProfileFormModal/ProfileFormModal", () => {
  return function MockProfileFormModal({ isOpen }: { isOpen: boolean }) {
    return <div data-testid="profile-form-modal" data-open={String(isOpen)} />;
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseProfiles = useProfiles as jest.MockedFunction<typeof useProfiles>;
const mockUseRoleGuard = useRoleGuard as jest.MockedFunction<
  typeof useRoleGuard
>;
const mockUseSpecialties = useSpecialties as jest.MockedFunction<
  typeof useSpecialties
>;
const mockUseOfficeCatalog = useOfficeCatalog as jest.MockedFunction<
  typeof useOfficeCatalog
>;

const adminProfile: Profile = {
  uid: "admin-uid",
  email: "admin@clinic.local",
  display_name: "Admin Central",
  role: "admin",
  status: "active",
  doctor_id: null,
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

function buildUseProfilesReturn(
  overrides: Partial<UseProfilesReturn> = {},
): UseProfilesReturn {
  return {
    items: [],
    loading: false,
    error: null,
    create: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    refetch: jest.fn(),
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

function buildUseSpecialtiesReturn(
  overrides: Partial<UseSpecialtiesReturn> = {},
): UseSpecialtiesReturn {
  return {
    items: [],
    loading: false,
    error: null,
    create: jest.fn().mockResolvedValue(true),
    update: jest.fn().mockResolvedValue(true),
    remove: jest.fn().mockResolvedValue(true),
    refetch: jest.fn(),
    ...overrides,
  };
}

function buildOffice(overrides: Partial<Office> = {}): Office {
  return {
    number: "1",
    enabled: true,
    occupied: false,
    occupied_by_doctor_id: null,
    occupied_by_doctor_name: null,
    occupied_by_status: null,
    can_disable: true,
    ...overrides,
  };
}

function buildUseOfficeCatalogReturn(
  overrides: Partial<UseOfficeCatalogReturn> = {},
): UseOfficeCatalogReturn {
  return {
    items: [buildOffice({ number: "1" })],
    loading: false,
    error: null,
    applyCapacity: jest.fn().mockResolvedValue(true),
    toggleEnabled: jest.fn().mockResolvedValue(true),
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("AdminProfilesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
    mockUseProfiles.mockReturnValue(buildUseProfilesReturn());
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn());
    mockUseSpecialties.mockReturnValue(buildUseSpecialtiesReturn());
    mockUseOfficeCatalog.mockReturnValue(buildUseOfficeCatalogReturn());
  });

  it("hides admin content when role guard denies access", () => {
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn({ allowed: false }));

    render(<AdminProfilesPage />);

    expect(screen.queryByText("Gestión Operativa")).not.toBeInTheDocument();
  });

  it("renders profile list for admin users", () => {
    mockUseProfiles.mockReturnValue(
      buildUseProfilesReturn({
        items: [
          {
            uid: "recep-uid",
            email: "recepcion@clinic.local",
            display_name: "Recepción Principal",
            role: "recepcionista",
            status: "active",
            doctor_id: null,
          },
        ],
      }),
    );

    render(<AdminProfilesPage />);

    expect(screen.getByText("Gestión Operativa")).toBeInTheDocument();
    expect(screen.getByText("Recepción Principal")).toBeInTheDocument();
    expect(screen.getByText("recepcion@clinic.local")).toBeInTheDocument();
    expect(screen.getByText("Activo")).toBeInTheDocument();
  });

  it("opens create modal when user clicks Crear perfil", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    const modal = screen.getByTestId("profile-form-modal");
    expect(modal).toHaveAttribute("data-open", "false");

    await user.click(screen.getByTestId("btn-create-profile"));

    expect(modal).toHaveAttribute("data-open", "true");
  });

  it("shows only profile view by default and hides other managers", () => {
    render(<AdminProfilesPage />);

    expect(screen.getByTestId("btn-mode-profiles")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.queryByTestId("office-manager")).not.toBeInTheDocument();
    expect(screen.queryByTestId("specialty-manager")).not.toBeInTheDocument();
  });

  it("switches to offices mode and hides profile actions", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-offices"));

    expect(screen.getByTestId("office-manager")).toBeInTheDocument();
    expect(screen.getByTestId("office-summary")).toHaveTextContent("Total:");
    expect(screen.getByTestId("office-capacity-form")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Nombre" }),
    ).not.toBeInTheDocument();
  });

  it("switches to specialties mode and hides profile and office views", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-specialties"));

    expect(screen.getByTestId("specialty-manager")).toBeInTheDocument();
    expect(screen.getByTestId("specialty-add-form")).toBeInTheDocument();
    expect(screen.getByTestId("btn-add-specialty")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();
    expect(screen.queryByTestId("office-manager")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Nombre" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("btn-mode-specialties")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps the mode selector visible across view changes", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    const selector = screen.getByRole("navigation", {
      name: "Selector de gestión",
    });
    expect(selector).toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-offices"));
    expect(selector).toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-specialties"));
    expect(selector).toBeInTheDocument();
  });

  it("keeps profile creation CTA only inside profile mode", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    expect(screen.getByTestId("btn-create-profile")).toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-offices"));
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-specialties"));
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-profiles"));
    expect(screen.getByTestId("btn-create-profile")).toBeInTheDocument();
  });

  it("scopes profiles error to profiles mode and clears it when switching modes", async () => {
    const user = userEvent.setup();
    mockUseProfiles.mockReturnValue(
      buildUseProfilesReturn({
        error: "Error de perfiles",
      }),
    );

    render(<AdminProfilesPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("Error de perfiles");

    await user.click(screen.getByTestId("btn-mode-offices"));

    expect(screen.queryByText("Error de perfiles")).not.toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Selector de gestión" }),
    ).toBeInTheDocument();

    expect(screen.getByTestId("btn-mode-profiles")).toHaveTextContent(
      "Gestión de perfiles",
    );
    expect(screen.getByTestId("btn-mode-specialties")).toHaveTextContent(
      "Gestionar especialidades",
    );
    expect(screen.getByTestId("btn-mode-offices")).toHaveTextContent(
      "Gestionar consultorios",
    );
  });

  it("shows office errors only when office mode is active", async () => {
    const user = userEvent.setup();
    mockUseOfficeCatalog.mockReturnValue(
      buildUseOfficeCatalogReturn({
        error: "Error de consultorios",
      }),
    );

    render(<AdminProfilesPage />);

    expect(screen.queryByText("Error de consultorios")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-offices"));
    expect(screen.getByTestId("office-error")).toHaveTextContent(
      "Error de consultorios",
    );

    await user.click(screen.getByTestId("btn-mode-profiles"));
    expect(screen.queryByText("Error de consultorios")).not.toBeInTheDocument();
  });

  it("restores profile context after returning from another mode", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-offices"));
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-profiles"));
    expect(screen.getByTestId("btn-create-profile")).toBeInTheDocument();

    await user.click(screen.getByTestId("btn-create-profile"));
    expect(screen.getByTestId("profile-form-modal")).toHaveAttribute(
      "data-open",
      "true",
    );
  });

  it("uses Gestion de perfiles as mode selector and not legacy Nuevo perfil label", () => {
    render(<AdminProfilesPage />);

    expect(screen.getByTestId("btn-mode-profiles")).toHaveTextContent(
      "Gestión de perfiles",
    );
    expect(
      screen.queryByRole("button", { name: /\+\s*nuevo perfil/i }),
    ).not.toBeInTheDocument();
  });

  it("closes modal and clears profile context when switching away from profiles mode and returning", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    // Step 1: open modal in profiles mode
    await user.click(screen.getByTestId("btn-create-profile"));
    expect(screen.getByTestId("profile-form-modal")).toHaveAttribute(
      "data-open",
      "true",
    );

    // Step 2: switch to another mode
    await user.click(screen.getByTestId("btn-mode-offices"));
    expect(screen.queryByTestId("profile-form-modal")).not.toBeInTheDocument();

    // Step 3: return to profiles
    await user.click(screen.getByTestId("btn-mode-profiles"));

    // Step 4: modal must stay closed until user explicitly opens it
    expect(screen.getByTestId("profile-form-modal")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("closes modal and clears profile context when switching to specialties and returning", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-create-profile"));
    expect(screen.getByTestId("profile-form-modal")).toHaveAttribute(
      "data-open",
      "true",
    );

    await user.click(screen.getByTestId("btn-mode-specialties"));
    await user.click(screen.getByTestId("btn-mode-profiles"));

    expect(screen.getByTestId("profile-form-modal")).toHaveAttribute(
      "data-open",
      "false",
    );
  });

  it("does not prefetch specialties or offices on initial profiles view", () => {
    render(<AdminProfilesPage />);

    expect(mockUseSpecialties).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseOfficeCatalog).toHaveBeenCalledWith({ enabled: false });
  });

  it("enables specialties fetch when switching to specialties mode", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-specialties"));

    expect(mockUseSpecialties).toHaveBeenCalledWith({ enabled: true });
  });

  it("enables offices fetch when switching to offices mode", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-offices"));

    expect(mockUseOfficeCatalog).toHaveBeenCalledWith({ enabled: true });
  });

  it("renders Gestión Operativa as the page heading", () => {
    render(<AdminProfilesPage />);

    expect(
      screen.getByRole("heading", { name: "Gestión Operativa" }),
    ).toBeInTheDocument();
  });
});
