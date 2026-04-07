import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LoginPage from "@/app/login/page";
import { Profile } from "@/domain/Profile";
import { useAuth, UseAuthReturn } from "@/hooks/useAuth";

const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function buildUseAuthReturn(
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

describe("LoginPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
  });

  it("redirects admin users to profiles administration", async () => {
    const adminProfile: Profile = {
      uid: "admin-uid",
      email: "admin@clinic.local",
      display_name: "Admin",
      role: "admin",
      status: "active",
      doctor_id: null,
    };

    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: adminProfile,
        loading: false,
      }),
    );

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/admin/profiles");
    });
  });

  it("redirects recepcionista users to registration", async () => {
    const recepcionistaProfile: Profile = {
      uid: "recepcion-uid",
      email: "recepcion@clinic.local",
      display_name: "Recepcion",
      role: "recepcionista",
      status: "active",
      doctor_id: null,
    };

    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: recepcionistaProfile,
        loading: false,
      }),
    );

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/registration");
    });
  });

  it("redirects doctor users to the doctor dashboard", async () => {
    // SPEC-008: doctor now has dedicated operational landing at /doctor/dashboard
    const doctorProfile: Profile = {
      uid: "doctor-uid",
      email: "doctor@clinic.local",
      display_name: "Dr. Torres",
      role: "doctor",
      status: "active",
      doctor_id: "doc-id-123",
    };

    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: doctorProfile,
        loading: false,
      }),
    );

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/doctor/dashboard");
    });
  });

  it("redirects doctor without doctor_id to the doctor dashboard", async () => {
    // SPEC-008: profile.doctor_id may be null; redirect still goes to /doctor/dashboard
    // doctor_id validation is handled by useDoctorDashboard on the landing page.
    const doctorProfileNoId: Profile = {
      uid: "doctor-uid-noid",
      email: "doctor.noid@clinic.local",
      display_name: "Dr. Sin Contexto",
      role: "doctor",
      status: "active",
      doctor_id: null,
    };

    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: doctorProfileNoId,
        loading: false,
      }),
    );

    render(<LoginPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/doctor/dashboard");
    });
  });

  it("maps invalid credentials errors to a user-friendly message", async () => {
    const user = userEvent.setup();
    const login = jest
      .fn()
      .mockRejectedValue(new Error("auth/invalid-credential"));

    mockUseAuth.mockReturnValue(buildUseAuthReturn({ login }));

    render(<LoginPage />);

    await user.type(
      screen.getByTestId("email-input"),
      "recepcion@clinic.local",
    );
    await user.type(screen.getByTestId("password-input"), "password123");
    await user.click(screen.getByTestId("submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("error-message")).toHaveTextContent(
        "Credenciales incorrectas. Verifica tu correo y contraseña.",
      );
    });

    expect(login).toHaveBeenCalledWith("recepcion@clinic.local", "password123");
  });

  it("renders auth flow error coming from useAuth state", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({ authError: "Perfil no configurado" }),
    );

    render(<LoginPage />);

    expect(screen.getByTestId("error-message")).toHaveTextContent(
      "Perfil no configurado",
    );
  });
});
