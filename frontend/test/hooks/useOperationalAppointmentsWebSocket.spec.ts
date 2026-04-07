/**
 * SPEC-010: Tests for useOperationalAppointmentsWebSocket hook
 *
 * Verifies:
 * - Does NOT connect when token is null
 * - Calls operationalRealTime.connect(token) when token is present
 * - Returns connectionStatus='unauthenticated' when token is null
 * - Sets authRejected=true when onAuthRejected fires
 * - Sets connected=true when onConnect fires
 * - Updates appointments when snapshot arrives
 */

import {
  mockOperationalRealTime,
  resetMocks,
} from "@test/mocks/DependencyContext.mock";
import { act, renderHook, waitFor } from "@testing-library/react";

import { Appointment } from "@/domain/Appointment";
import { useOperationalAppointmentsWebSocket } from "@/hooks/useOperationalAppointmentsWebSocket";

// Mock DependencyContext to inject mockOperationalRealTime
jest.mock("@/context/DependencyContext", () => ({
  useDependencies: jest.fn(() => ({
    repository: { getAppointments: jest.fn() },
    realTime: {},
    operationalRealTime: mockOperationalRealTime,
  })),
}));

// Mock useAuth so we can control the token
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

function buildAuthWithToken(token: string | null) {
  return {
    user: null,
    profile: null,
    token,
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
  };
}

describe("useOperationalAppointmentsWebSocket", () => {
  beforeEach(() => {
    resetMocks();
    mockUseAuth.mockReturnValue(buildAuthWithToken("firebase-id-token"));
  });

  describe("Connection gating", () => {
    it("does NOT call operationalRealTime.connect when token is null", () => {
      mockUseAuth.mockReturnValue(buildAuthWithToken(null));

      renderHook(() => useOperationalAppointmentsWebSocket());

      expect(mockOperationalRealTime.connect).not.toHaveBeenCalled();
    });

    it("returns connectionStatus='unauthenticated' when token is null", () => {
      mockUseAuth.mockReturnValue(buildAuthWithToken(null));

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      expect(result.current.connectionStatus).toBe("unauthenticated");
      expect(result.current.connected).toBe(false);
    });

    it("calls operationalRealTime.connect(token) with the token when present", () => {
      renderHook(() => useOperationalAppointmentsWebSocket());

      expect(mockOperationalRealTime.connect).toHaveBeenCalledWith(
        "firebase-id-token",
      );
    });

    it("calls operationalRealTime.disconnect() on unmount", () => {
      const { unmount } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      unmount();

      expect(mockOperationalRealTime.disconnect).toHaveBeenCalled();
    });
  });

  describe("Auth rejection", () => {
    it("sets authRejected=true when onAuthRejected fires", async () => {
      let onAuthRejectedCallback: (() => void) | null = null;
      mockOperationalRealTime.onAuthRejected.mockImplementation((cb: () => void) => {
        onAuthRejectedCallback = cb;
      });

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      expect(result.current.authRejected).toBe(false);

      act(() => {
        onAuthRejectedCallback?.();
      });

      await waitFor(() => {
        expect(result.current.authRejected).toBe(true);
        expect(result.current.connected).toBe(false);
        expect(result.current.connectionStatus).toBe("auth_rejected");
      });
    });

    it("sets connected=false when auth is rejected", async () => {
      let onConnectCb: (() => void) | null = null;
      let onAuthRejectedCb: (() => void) | null = null;

      mockOperationalRealTime.onConnect.mockImplementation((cb: () => void) => {
        onConnectCb = cb;
      });
      mockOperationalRealTime.onAuthRejected.mockImplementation((cb: () => void) => {
        onAuthRejectedCb = cb;
      });

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      act(() => {
        onConnectCb?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      act(() => {
        onAuthRejectedCb?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
        expect(result.current.authRejected).toBe(true);
      });
    });
  });

  describe("Connection lifecycle", () => {
    it("sets connected=true when onConnect fires", async () => {
      let onConnectCallback: (() => void) | null = null;
      mockOperationalRealTime.onConnect.mockImplementation((cb: () => void) => {
        onConnectCallback = cb;
      });

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      expect(result.current.connected).toBe(false);

      act(() => {
        onConnectCallback?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.isConnecting).toBe(false);
        expect(result.current.authRejected).toBe(false);
      });
    });

    it("sets connected=false when onDisconnect fires", async () => {
      let onDisconnectCallback: (() => void) | null = null;
      mockOperationalRealTime.onDisconnect.mockImplementation((cb: () => void) => {
        onDisconnectCallback = cb;
      });

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      act(() => {
        onDisconnectCallback?.();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });
    });

    it("sets error message when onError fires", async () => {
      let onErrorCallback: ((err: Error) => void) | null = null;
      mockOperationalRealTime.onError.mockImplementation((cb: (err: Error) => void) => {
        onErrorCallback = cb;
      });

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      act(() => {
        onErrorCallback?.(new Error("connection refused"));
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.connected).toBe(false);
      });
    });
  });

  describe("Data management", () => {
    it("updates appointments state when onSnapshot fires", async () => {
      let onSnapshotCallback: ((data: Appointment[]) => void) | null = null;
      mockOperationalRealTime.onSnapshot.mockImplementation((cb: (data: Appointment[]) => void) => {
        onSnapshotCallback = cb;
      });

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      const appointments: Appointment[] = [
        {
          id: "apt-1",
          fullName: "Paciente A",
          idCard: 11111,
          office: "1",
          status: "waiting",
          priority: "medium",
          timestamp: 1700000000,
          doctorId: null,
          doctorName: null,
        },
      ];

      act(() => {
        onSnapshotCallback?.(appointments);
      });

      await waitFor(() => {
        expect(result.current.appointments).toEqual(appointments);
      });
    });

    it("merges updated appointment into the list", async () => {
      let onSnapshotCallback: ((data: Appointment[]) => void) | null = null;
      let onUpdateCallback: ((data: Appointment) => void) | null = null;

      mockOperationalRealTime.onSnapshot.mockImplementation((cb: (data: Appointment[]) => void) => {
        onSnapshotCallback = cb;
      });
      mockOperationalRealTime.onAppointmentUpdated.mockImplementation((cb: (data: Appointment) => void) => {
        onUpdateCallback = cb;
      });

      const { result } = renderHook(() =>
        useOperationalAppointmentsWebSocket(),
      );

      const initial: Appointment[] = [
        {
          id: "apt-1",
          fullName: "Paciente A",
          idCard: 11111,
          office: "1",
          status: "waiting",
          priority: "medium",
          timestamp: 1700000000,
          doctorId: null,
          doctorName: null,
        },
      ];

      act(() => {
        onSnapshotCallback?.(initial);
      });

      const updated: Appointment = {
        ...initial[0],
        status: "called",
        doctorId: "doc-1",
        doctorName: "Dr. House",
      };

      act(() => {
        onUpdateCallback?.(updated);
      });

      await waitFor(() => {
        expect(result.current.appointments[0].status).toBe("called");
        expect(result.current.appointments[0].doctorId).toBe("doc-1");
      });
    });
  });
});
