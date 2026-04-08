"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDependencies } from "@/context/DependencyContext";
import { Appointment } from "@/domain/Appointment";

/**
 * Real-time hook using WebSocket (Socket.IO).
 */
export function useAppointmentsWebSocket(
  onUpdate?: (appointment: Appointment) => void,
) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  // tracks whether we've ever had a successful connection in this session
  const hasConnectedRef = useRef(false);

  // 🛡️ HUMAN CHECK - DI: Inject RealTime implementation (SocketIO, SSE, Mock)
  const { realTime } = useDependencies();

  const updateAppointment = useCallback((updatedAppointment: Appointment) => {
    setAppointments((prev) => {
      // Remove completed/cancelled appointments from the public screen state
      if (
        updatedAppointment.status === "completed" ||
        updatedAppointment.status === "cancelled"
      ) {
        return prev.filter((t) => t.id !== updatedAppointment.id);
      }

      const index = prev.findIndex((t) => t.id === updatedAppointment.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = updatedAppointment;
        return updated;
      }
      return [...prev, updatedAppointment];
    });
  }, []);

  useEffect(() => {
    // Setup listeners
    realTime.onConnect(() => {
      hasConnectedRef.current = true;
      setConnected(true);
      setIsConnecting(false);
      setIsReconnecting(false);
      setError(null);
    });

    realTime.onDisconnect(() => {
      setConnected(false);
      setIsConnecting(true);
      // SPEC-003: if we had a prior connection, this is a reconnect attempt
      if (hasConnectedRef.current) {
        setIsReconnecting(true);
      }
    });

    realTime.onError((_err) => {
      setError("Error de conexión en tiempo real");
      setConnected(false);
      setIsConnecting(false);
      setIsReconnecting(false);
    });

    realTime.onSnapshot((data) => {
      // Public screen only shows active appointments (waiting + called)
      setAppointments(
        data.filter((a) => a.status === "waiting" || a.status === "called"),
      );
    });

    realTime.onAppointmentUpdated((data) => {
      updateAppointment(data);
      if (onUpdate) onUpdate(data);
    });

    // Initialize connection
    realTime.connect();

    return () => {
      realTime.disconnect();
    };
  }, [realTime, updateAppointment, onUpdate]);

  // SPEC-003: expose reconnecting as distinct status (🟡 Reconectando...)
  const connectionStatus:
    | "connected"
    | "connecting"
    | "reconnecting"
    | "disconnected" = connected
    ? "connected"
    : isReconnecting
      ? "reconnecting"
      : isConnecting
        ? "connecting"
        : "disconnected";

  return { appointments, error, connected, isConnecting, connectionStatus };
}
