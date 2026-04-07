import { act, render, screen, waitFor } from "@testing-library/react";
import { signOut } from "firebase/auth";

import { firebaseAuth } from "@/config/firebase";
import { AuthProvider } from "@/context/AuthProvider";
import { useAuth } from "@/hooks/useAuth";
import { resolveSession } from "@/services/authService";

let authStateChangedHandler: ((user: unknown) => void) | undefined;

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock("@/config/firebase", () => ({
  firebaseAuth: {
    onAuthStateChanged: jest.fn(),
  },
}));

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/services/authService", () => ({
  resolveSession: jest.fn(),
}));

const mockResolveSession = resolveSession as jest.MockedFunction<
  typeof resolveSession
>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockFirebaseAuth = firebaseAuth as unknown as {
  onAuthStateChanged: jest.Mock;
};
const mockOnAuthStateChanged = mockFirebaseAuth.onAuthStateChanged as jest.Mock;

function AuthProbe() {
  const { loading, authError, profile, token } = useAuth();

  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="auth-error">{authError ?? ""}</span>
      <span data-testid="has-profile">{String(Boolean(profile))}</span>
      <span data-testid="token">{token ?? ""}</span>
    </div>
  );
}

describe("useAuth session handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authStateChangedHandler = undefined;

    mockOnAuthStateChanged.mockImplementation(
      (callback: (user: unknown) => void) => {
        authStateChangedHandler = callback;
        return jest.fn();
      },
    );
  });

  it("stores profile and token when backend session resolution succeeds", async () => {
    const user = {
      getIdToken: jest.fn().mockResolvedValue("id-token-123"),
    };

    mockResolveSession.mockResolvedValueOnce({
      uid: "uid-admin",
      email: "admin@clinic.local",
      display_name: "Admin",
      role: "admin",
      status: "active",
      doctor_id: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(authStateChangedHandler).toBeDefined();

    await act(async () => {
      authStateChangedHandler?.(user);
    });

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(mockResolveSession).toHaveBeenCalledWith("id-token-123");
    expect(screen.getByTestId("has-profile")).toHaveTextContent("true");
    expect(screen.getByTestId("token")).toHaveTextContent("id-token-123");
    expect(screen.getByTestId("auth-error")).toHaveTextContent("");
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("clears auth state and exposes error when session resolution fails", async () => {
    const user = {
      getIdToken: jest.fn().mockResolvedValue("id-token-123"),
    };

    mockResolveSession.mockRejectedValueOnce(
      new Error("Perfil no configurado"),
    );

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(authStateChangedHandler).toBeDefined();

    await act(async () => {
      authStateChangedHandler?.(user);
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith(mockFirebaseAuth as never);
    });

    expect(screen.getByTestId("auth-error")).toHaveTextContent(
      "Perfil no configurado",
    );
    expect(screen.getByTestId("has-profile")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("");
  });

  it("clears auth state when backend session returns 401", async () => {
    const user = {
      getIdToken: jest.fn().mockResolvedValue("id-token-401"),
    };

    mockResolveSession.mockRejectedValueOnce(new Error("HTTP_ERROR: 401"));

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    expect(authStateChangedHandler).toBeDefined();

    await act(async () => {
      authStateChangedHandler?.(user);
    });

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledWith(mockFirebaseAuth as never);
    });

    expect(screen.getByTestId("auth-error")).toHaveTextContent(
      "HTTP_ERROR: 401",
    );
    expect(screen.getByTestId("has-profile")).toHaveTextContent("false");
    expect(screen.getByTestId("token")).toHaveTextContent("");
  });
});
