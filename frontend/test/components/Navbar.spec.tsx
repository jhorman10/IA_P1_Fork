import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";

import Navbar from "@/components/Navbar/Navbar";
import { useTheme } from "@/context/ThemeProvider";
import { Profile, UserRole } from "@/domain/Profile";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/context/ThemeProvider", () => ({
  useTheme: jest.fn(),
}));

const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

function buildProfile(role: UserRole): Profile {
  return {
    uid: `${role}-uid`,
    email: `${role}@clinic.local`,
    display_name: role,
    role,
    status: "active",
    doctor_id: role === "doctor" ? "doc-1" : null,
  };
}

function buildUseAuthReturn(
  overrides: Partial<UseAuthReturn> = {},
): UseAuthReturn {
  return {
    user: null,
    profile: buildProfile("admin"),
    token: "token",
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildThemeReturn(
  overrides: Partial<ReturnType<typeof useTheme>> = {},
): ReturnType<typeof useTheme> {
  return {
    theme: "light",
    toggleTheme: jest.fn(),
    ...overrides,
  };
}

describe("Navbar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseTheme.mockReturnValue(buildThemeReturn());
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
  });

  it.each(["admin", "recepcionista", "doctor"] as const)(
    "hides Turnos and keeps Dashboard visible for %s",
    (role) => {
      mockUseAuth.mockReturnValue(
        buildUseAuthReturn({ profile: buildProfile(role) }),
      );

      render(<Navbar />);

      expect(
        screen.queryByRole("link", { name: /^Turnos$/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
        "href",
        "/dashboard",
      );
    },
  );

  it("shows Gestión Operativa link for admin and removes Perfiles label", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({ profile: buildProfile("admin") }),
    );

    render(<Navbar />);

    expect(
      screen.getByRole("link", { name: "Gestión Operativa" }),
    ).toHaveAttribute("href", "/admin/profiles");
    expect(
      screen.queryByRole("link", { name: "Perfiles" }),
    ).not.toBeInTheDocument();
  });

  it("hides navbar while auth state is loading", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        loading: true,
        profile: buildProfile("admin"),
      }),
    );

    const { container } = render(<Navbar />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("hides navbar when no profile is available", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        loading: false,
        profile: null,
      }),
    );

    const { container } = render(<Navbar />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
