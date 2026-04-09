import { act, render, screen } from "@testing-library/react";
import React from "react";

import CompletedHistoryDashboard from "@/app/dashboard/page";

// Mock useRoleGuard to allow access
jest.mock("@/hooks/useRoleGuard", () => ({
  useRoleGuard: jest.fn(() => ({ allowed: true, redirectTo: "/login" })),
}));

function createMockAudio() {
  return {
    init: jest.fn(),
    unlock: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
    play: jest.fn(),
  };
}

let mockAudio: ReturnType<typeof createMockAudio>;

let mockHookState: any;
let storedCallback: ((apt: any) => void) | null = null;

jest.mock("@/services/AudioService", () => ({
  get audioService() {
    return mockAudio;
  },
}));

jest.mock("@/hooks/useAppointmentsWebSocket", () => ({
  useAppointmentsWebSocket: (cb: (apt: any) => void) => {
    storedCallback = cb;
    return mockHookState;
  },
}));

describe("CompletedHistoryDashboard coverage", () => {
  beforeEach(() => {
    mockAudio = createMockAudio();
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: false,
      isConnecting: false,
      connectionStatus: "connecting",
    };
    mockAudio.play.mockClear();
    mockAudio.isEnabled.mockReturnValue(false);
    storedCallback = null;
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("renders empty states when no appointments", () => {
    render(<CompletedHistoryDashboard />);

    expect(
      screen.getByText(/No hay turnos siendo atendidos/),
    ).toBeInTheDocument();
    expect(screen.getByText(/No hay turnos en espera/)).toBeInTheDocument();
    expect(
      screen.getByText(/No hay turnos completados aún/),
    ).toBeInTheDocument();
  });

  it("renders called, waiting, and completed lists", () => {
    mockHookState = {
      appointments: [
        {
          id: "1",
          fullName: "Called One",
          office: "1",
          idCard: 1,
          status: "called",
          priority: "high",
          timestamp: 2,
        },
        {
          id: "2",
          fullName: "Waiting Two",
          office: null,
          idCard: 2,
          status: "waiting",
          priority: "low",
          timestamp: 3,
        },
        {
          id: "3",
          fullName: "Completed Three",
          office: "2",
          idCard: 3,
          status: "completed",
          priority: "medium",
          timestamp: 4,
          completedAt: 5,
        },
      ],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(screen.getByText(/En consultorio/)).toBeInTheDocument();
    expect(screen.getByText(/En espera/)).toBeInTheDocument();
    expect(screen.getByText(/Completados/)).toBeInTheDocument();
  });

  it("shows skeletons when connecting", () => {
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: false,
      isConnecting: true,
      connectionStatus: "connecting",
    };

    const { container } = render(<CompletedHistoryDashboard />);

    const skeletons = container.querySelectorAll(".skeletonCard");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows error state when hook fails", () => {
    mockHookState = {
      appointments: [],
      error: "network-error",
      _connected: false,
      isConnecting: false,
      connectionStatus: "disconnected",
    };

    render(<CompletedHistoryDashboard />);

    expect(screen.getByText(/network-error/)).toBeInTheDocument();
  });

  it("hides audio hint when audio is enabled", () => {
    const useStateSpy = jest.spyOn(React, "useState");
    useStateSpy.mockImplementationOnce(() => [true, jest.fn()]);
    mockAudio.isEnabled.mockReturnValue(true);

    render(<CompletedHistoryDashboard />);

    expect(screen.queryByText(/activar sonido/)).not.toBeInTheDocument();

    useStateSpy.mockRestore();
  });

  it("shows toast and plays on completed update", async () => {
    mockAudio.isEnabled.mockReturnValue(true);
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(storedCallback).toBeTruthy();

    act(() => {
      storedCallback?.({
        id: "99",
        status: "completed",
        priority: "medium",
        timestamp: 1,
      });
    });

    expect(screen.getByText(/Turno completado/)).toBeInTheDocument();
  });

  it("shows toast without playing audio when disabled", () => {
    jest.useFakeTimers();
    mockAudio.isEnabled.mockReturnValue(false);
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    act(() => {
      storedCallback?.({
        id: "77",
        status: "completed",
        priority: "low",
        timestamp: 1,
      });
    });

    expect(mockAudio.play).not.toHaveBeenCalled();
    expect(screen.getByText(/Turno completado/)).toBeInTheDocument();

    jest.useRealTimers();
  });

  it("renders assignment notification on waiting to called transition", async () => {
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    expect(storedCallback).toBeTruthy();

    act(() => {
      storedCallback?.({
        id: "apt-200",
        fullName: "Maria Lopez",
        idCard: 123456,
        office: null,
        timestamp: 1,
        status: "waiting",
        priority: "medium",
        doctorId: null,
        doctorName: null,
      });
    });

    expect(
      screen.queryByTestId("assignment-notification"),
    ).not.toBeInTheDocument();

    act(() => {
      storedCallback?.({
        id: "apt-200",
        fullName: "Maria Lopez",
        idCard: 123456,
        office: "4",
        timestamp: 2,
        status: "called",
        priority: "medium",
        doctorId: "doc-004",
        doctorName: "Dr. Luis Gomez",
      });
    });

    expect(
      await screen.findByTestId("assignment-notification"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Luis Gomez/)).toBeInTheDocument();
    expect(screen.getByText(/Consultorio 4/)).toBeInTheDocument();
  });

  it("keeps notification and toast flow working in dark mode", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    mockAudio.isEnabled.mockReturnValue(true);
    mockHookState = {
      appointments: [],
      error: undefined,
      _connected: true,
      isConnecting: false,
      connectionStatus: "connected",
    };

    render(<CompletedHistoryDashboard />);

    act(() => {
      storedCallback?.({
        id: "apt-300",
        fullName: "Dark Mode Patient",
        idCard: 98765,
        office: null,
        timestamp: 1,
        status: "waiting",
        priority: "medium",
        doctorId: null,
        doctorName: null,
      });
    });

    act(() => {
      storedCallback?.({
        id: "apt-300",
        fullName: "Dark Mode Patient",
        idCard: 98765,
        office: "2",
        timestamp: 2,
        status: "called",
        priority: "medium",
        doctorId: "doc-002",
        doctorName: "Dr. Dark",
      });
    });

    expect(
      await screen.findByTestId("assignment-notification"),
    ).toBeInTheDocument();

    act(() => {
      storedCallback?.({
        id: "apt-301",
        status: "completed",
        priority: "low",
        timestamp: 3,
      });
    });

    expect(screen.getByText(/Turno completado/)).toBeInTheDocument();
  });
});
