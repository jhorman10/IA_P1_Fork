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
    token: "token-admin",
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
    items: [
      buildOffice({ number: "1" }),
      buildOffice({ number: "2", enabled: false }),
    ],
    loading: false,
    error: null,
    applyCapacity: jest.fn().mockResolvedValue(true),
    toggleEnabled: jest.fn().mockResolvedValue(true),
    refetch: jest.fn(),
    ...overrides,
  };
}

describe("AdminProfilesPage SPEC-017 exclusive mode navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
    mockUseProfiles.mockReturnValue(buildUseProfilesReturn());
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn());
    mockUseSpecialties.mockReturnValue(buildUseSpecialtiesReturn());
    mockUseOfficeCatalog.mockReturnValue(buildUseOfficeCatalogReturn());
  });

  it("renders profile mode as default on page load", () => {
    render(<AdminProfilesPage />);

    expect(screen.getByTestId("btn-mode-profiles")).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByTestId("btn-create-profile")).toBeInTheDocument();
    expect(screen.queryByTestId("office-manager")).not.toBeInTheDocument();
    expect(screen.queryByTestId("specialty-manager")).not.toBeInTheDocument();
  });

  it("switches to office mode and hides profile and specialty views", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-offices"));

    expect(screen.getByTestId("office-manager")).toBeInTheDocument();
    expect(screen.getByTestId("office-summary")).toHaveTextContent("Total: 2");
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();
    expect(screen.queryByTestId("specialty-manager")).not.toBeInTheDocument();
    expect(screen.getByTestId("btn-mode-offices")).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("switches to specialty mode and hides profile and office views", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-specialties"));

    expect(screen.getByTestId("specialty-manager")).toBeInTheDocument();
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();
    expect(screen.queryByTestId("office-manager")).not.toBeInTheDocument();
    expect(screen.getByTestId("btn-mode-specialties")).toHaveAttribute(
      "aria-current",
      "page",
    );
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

  it("scopes loading and error states to the active profiles mode", () => {
    mockUseProfiles.mockReturnValue(
      buildUseProfilesReturn({
        loading: true,
        items: [],
        error: "Error de perfiles",
      }),
    );

    render(<AdminProfilesPage />);

    expect(screen.getByText("Cargando perfiles...")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Error de perfiles");
  });

  it("exposes management selector with the updated accessible name", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    const modeSelectorNav = screen.getByRole("navigation", {
      name: "Selector de gestión",
    });
    expect(modeSelectorNav).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gestión de perfiles" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gestionar especialidades" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Gestionar consultorios" }),
    ).toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-offices"));
    expect(modeSelectorNav).toBeInTheDocument();
    expect(screen.queryByTestId("specialty-manager")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-specialties"));
    expect(modeSelectorNav).toBeInTheDocument();
    expect(screen.queryByTestId("office-manager")).not.toBeInTheDocument();
  });

  it("returns to profile mode and restores profile context when re-selected", async () => {
    const user = userEvent.setup();

    render(<AdminProfilesPage />);

    await user.click(screen.getByTestId("btn-mode-offices"));
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("btn-mode-profiles"));
    expect(screen.getByTestId("btn-create-profile")).toBeInTheDocument();
    expect(screen.queryByTestId("office-manager")).not.toBeInTheDocument();
  });

  it("hides page content when role guard denies access", () => {
    mockUseRoleGuard.mockReturnValue(buildRoleGuardReturn({ allowed: false }));

    render(<AdminProfilesPage />);

    expect(screen.queryByTestId("btn-mode-profiles")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-create-profile")).not.toBeInTheDocument();
  });
});
