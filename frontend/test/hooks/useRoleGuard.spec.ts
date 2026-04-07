import { renderHook, waitFor } from "@testing-library/react";

import { useAuth, UseAuthReturn } from "@/hooks/useAuth";
import { useRoleGuard } from "@/hooks/useRoleGuard";

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

describe("useRoleGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthReturn());
  });

  it("returns allowed=true for an authorized role", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: {
          uid: "uid-admin",
          email: "admin@clinic.local",
          display_name: "Admin",
          role: "admin",
          status: "active",
          doctor_id: null,
        },
      }),
    );

    const { result } = renderHook(() => useRoleGuard(["admin"]));

    expect(result.current.allowed).toBe(true);
    expect(result.current.redirectTo).toBe("/login");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /login when there is no active session", async () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: null,
        loading: false,
      }),
    );

    const { result } = renderHook(() => useRoleGuard(["admin"]));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });

    expect(result.current.allowed).toBe(false);
  });

  it("does not redirect while auth state is still loading", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: null,
        loading: true,
      }),
    );

    const { result } = renderHook(() => useRoleGuard(["admin"]));

    expect(result.current.allowed).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps allowed=false for unauthorized role without forcing redirect", () => {
    mockUseAuth.mockReturnValue(
      buildUseAuthReturn({
        profile: {
          uid: "uid-doctor",
          email: "doctor@clinic.local",
          display_name: "Doctor",
          role: "doctor",
          status: "active",
          doctor_id: "doctor-1",
        },
      }),
    );

    const { result } = renderHook(() =>
      useRoleGuard(["admin", "recepcionista"]),
    );

    expect(result.current.allowed).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
