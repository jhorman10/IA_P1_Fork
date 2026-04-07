import { act, renderHook } from "@testing-library/react";

import { useAuthContext } from "@/context/AuthProvider";
import { Profile } from "@/domain/Profile";
import { useAuth } from "@/hooks/useAuth";
import {
  signInWithFirebase,
  signOutFromFirebase,
} from "@/services/authService";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/context/AuthProvider", () => ({
  useAuthContext: jest.fn(),
}));

jest.mock("@/services/authService", () => ({
  signInWithFirebase: jest.fn(),
  signOutFromFirebase: jest.fn(),
}));

const mockUseAuthContext = useAuthContext as jest.MockedFunction<
  typeof useAuthContext
>;
const mockSignInWithFirebase = signInWithFirebase as jest.MockedFunction<
  typeof signInWithFirebase
>;
const mockSignOutFromFirebase = signOutFromFirebase as jest.MockedFunction<
  typeof signOutFromFirebase
>;

function buildProfile(): Profile {
  return {
    uid: "uid-1",
    email: "admin@clinic.local",
    display_name: "Admin",
    role: "admin",
    status: "active",
    doctor_id: null,
  };
}

describe("useAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthContext.mockReturnValue({
      user: null,
      profile: null,
      token: null,
      loading: false,
      authError: null,
    });
  });

  it("returns auth state from AuthProvider context", () => {
    const profile = buildProfile();

    mockUseAuthContext.mockReturnValue({
      user: null,
      profile,
      token: "id-token-123",
      loading: true,
      authError: "test error",
    });

    const { result } = renderHook(() => useAuth());

    expect(result.current.profile).toEqual(profile);
    expect(result.current.token).toBe("id-token-123");
    expect(result.current.loading).toBe(true);
    expect(result.current.authError).toBe("test error");
  });

  it("delegates login to signInWithFirebase", async () => {
    mockSignInWithFirebase.mockResolvedValue({} as never);
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login("recepcion@clinic.local", "password123");
    });

    expect(mockSignInWithFirebase).toHaveBeenCalledWith(
      "recepcion@clinic.local",
      "password123",
    );
  });

  it("delegates logout and navigates to login page", async () => {
    mockSignOutFromFirebase.mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.logout();
    });

    expect(mockSignOutFromFirebase).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
