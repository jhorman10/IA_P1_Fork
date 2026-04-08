/**
 * @jest-environment jsdom
 *
 * SPEC-003 — Isolated tests for main page (AppointmentsScreen):
 *  - CRITERIO-2.1: Queue position badges on main patient flow
 *  - CRITERIO-2.3: Reconnecting status shown (not "Conectando...")
 *  - CRITERIO-3.1: AssignmentNotification on waiting → called transition
 *
 * Isolated from page.spec.tsx to avoid jest.resetModules() contamination.
 */

import { act, render, screen, waitFor } from "@testing-library/react";

import AppointmentsScreen from "@/app/page";
import { Appointment } from "@/domain/Appointment";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";

jest.mock("@/hooks/useAppointmentsWebSocket");

jest.mock("@/services/AudioService", () => ({
  audioService: {
    init: jest.fn(),
    unlock: jest.fn().mockResolvedValue(undefined),
    isEnabled: jest.fn().mockReturnValue(false),
    play: jest.fn(),
  },
}));

const mockHook = jest.mocked(useAppointmentsWebSocket);

let capturedOnUpdate: ((appt: Appointment) => void) | undefined;

const baseWaiting: Appointment[] = [
  {
    id: "apt-001",
    fullName: "John High",
    status: "waiting",
    office: null,
    priority: "high",
    timestamp: Date.now() - 300000,
    idCard: 111,
    doctorId: null,
    doctorName: null,
  },
  {
    id: "apt-002",
    fullName: "Jane Medium",
    status: "waiting",
    office: null,
    priority: "medium",
    timestamp: Date.now() - 200000,
    idCard: 222,
    doctorId: null,
    doctorName: null,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnUpdate = undefined;
  mockHook.mockImplementation((onUpdate) => {
    capturedOnUpdate = onUpdate;
    return {
      appointments: baseWaiting,
      error: null,
      connected: true,
      isConnecting: false,
      connectionStatus: "connected" as const,
    };
  });
});

describe("SPEC-003 — Main page patient flow", () => {
  describe("CRITERIO-2.1: Queue position visibility", () => {
    it("should render queue position badge for each waiting appointment", () => {
      render(<AppointmentsScreen />);

      expect(screen.getByLabelText("Posición 1 de 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Posición 2 de 2")).toBeInTheDocument();
    });

    it("should order waiting appointments by priority before assigning positions", () => {
      render(<AppointmentsScreen />);

      const badges = screen.getAllByLabelText(/Posición \d de \d/);
      // High priority patient should be at position 1
      expect(badges[0]).toHaveAttribute("aria-label", "Posición 1 de 2");
    });
  });

  describe("CRITERIO-2.3: Reconnecting status indicator", () => {
    it("should display Reconectando... label when connectionStatus is reconnecting", () => {
      mockHook.mockReturnValueOnce({
        appointments: [],
        error: null,
        connected: false,
        isConnecting: true,
        connectionStatus: "reconnecting" as const,
      });

      render(<AppointmentsScreen />);

      expect(screen.getByText("Reconectando...")).toBeInTheDocument();
    });

    it("should display Conectando... for initial connecting state (not reconnect)", () => {
      mockHook.mockReturnValueOnce({
        appointments: [],
        error: null,
        connected: false,
        isConnecting: true,
        connectionStatus: "connecting" as const,
      });

      render(<AppointmentsScreen />);

      expect(screen.getByText("Conectando...")).toBeInTheDocument();
      expect(screen.queryByText("Reconectando...")).not.toBeInTheDocument();
    });
  });

  describe("CRITERIO-3.1: AssignmentNotification on waiting → called transition", () => {
    it("should show notification when appointment transitions from waiting to called", async () => {
      render(<AppointmentsScreen />);

      const onUpdate = capturedOnUpdate as (appt: Appointment) => void;
      expect(onUpdate).toBeDefined();

      // Simulate the transition: waiting → called
      act(() => {
        onUpdate({
          id: "apt-001",
          fullName: "John High",
          status: "called" as const,
          office: "3",
          priority: "high" as const,
          timestamp: Date.now(),
          idCard: 111,
          doctorId: "doc-1",
          doctorName: "Dr. García",
        });
      });

      await waitFor(() => {
        expect(
          screen.getByTestId("assignment-notification"),
        ).toBeInTheDocument();
      });
    });

    it("should NOT show notification for appointments that start as called on page load", async () => {
      // Simulate an already-called appointment in the initial snapshot
      mockHook.mockImplementation((onUpdate) => {
        capturedOnUpdate = onUpdate;
        return {
          appointments: [
            {
              ...baseWaiting[0],
              id: "apt-pre-called",
              status: "called" as const,
              office: "1",
              doctorId: "doc-0",
              doctorName: "Dr. Pre",
            } as Appointment,
          ],
          error: null,
          connected: true,
          isConnecting: false,
          connectionStatus: "connected" as const,
        };
      });

      render(<AppointmentsScreen />);

      const onUpdate = capturedOnUpdate as (appt: Appointment) => void;

      // Fire an update for the same appointment that was already called
      act(() => {
        onUpdate({
          id: "apt-pre-called",
          fullName: "John High",
          status: "called" as const,
          office: "1",
          priority: "high" as const,
          timestamp: Date.now(),
          idCard: 111,
          doctorId: "doc-1",
          doctorName: "Dr. García",
        });
      });

      // No notification should appear (no waiting → called transition)
      await waitFor(() => {
        expect(
          screen.queryByTestId("assignment-notification"),
        ).not.toBeInTheDocument();
      });
    });
  });
});
