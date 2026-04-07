"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDependencies } from "@/context/DependencyContext";
import { Appointment } from "@/domain/Appointment";
import { useAuth } from "@/hooks/useAuth";

/**
 * SPEC-010: Real-time hook for the authenticated operational channel.
 * Reads the Firebase idToken from useAuth() and connects to /ws/operational-appointments.
 * Does not attempt connection when token is null.
 * Exposes authRejected=true when the server emits WS_AUTH_ERROR or auth disconnect.
 */
export function useOperationalAppointmentsWebSocket(
  onUpdate?: (appointment: Appointment) => void,
) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [authRejected, setAuthRejected] = useState(false);
  const hasConnectedRef = useRef(false);

  const { operationalRealTime } = useDependencies();
  const { token } = useAuth();

  const updateAppointment = useCallback((updatedAppointment: Appointment) => {
    setAppointments((prev) => {
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
    if (!token) {
      return;
    }

    setIsConnecting(true);

    operationalRealTime.onConnect(() => {
      hasConnectedRef.current = true;
      setConnected(true);
      setIsConnecting(false);
      setIsReconnecting(false);
      setError(null);
    });

    operationalRealTime.onDisconnect(() => {
      setConnected(false);
      setIsConnecting(true);
      if (hasConnectedRef.current) {
        setIsReconnecting(true);
      }
    });

    operationalRealTime.onError(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_err: Error) => {
        setError("Error de conexión en tiempo real operativo");
        setConnected(false);
        setIsConnecting(false);
        setIsReconnecting(false);
      },
    );

    operationalRealTime.onAuthRejected(() => {
      setAuthRejected(true);
      setConnected(false);
      setIsConnecting(false);
      setIsReconnecting(false);
    });

    operationalRealTime.onSnapshot((data: Appointment[]) => {
      setAppointments(data);
    });

    operationalRealTime.onAppointmentUpdated((data: Appointment) => {
      updateAppointment(data);
      if (onUpdate) onUpdate(data);
    });

    operationalRealTime.connect(token);

    return () => {
      operationalRealTime.disconnect();
    };
  }, [operationalRealTime, token, updateAppointment, onUpdate]);

  const connectionStatus = authRejected
    ? "auth_rejected"
    : !token
      ? "unauthenticated"
      : connected
        ? "connected"
        : isReconnecting
          ? "reconnecting"
          : isConnecting
            ? "connecting"
            : "disconnected";

  return {
    appointments,
    error,
    connected,
    isConnecting,
    authRejected,
    connectionStatus: connectionStatus as
      | "connected"
      | "reconnecting"
      | "connecting"
      | "disconnected"
      | "unauthenticated"
      | "auth_rejected",
  };
}
