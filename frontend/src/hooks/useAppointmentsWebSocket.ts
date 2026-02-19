"use client";

import { useEffect, useState, useCallback } from "react";
import { Appointment } from "@/domain/Appointment";
import { useDependencies } from "@/context/DependencyContext";

/**
 * Real-time hook using WebSocket (Socket.IO).
 */
/**
 * Real-time hook using WebSocket (Socket.IO).
 */
export function useAppointmentsWebSocket(onUpdate?: (appointment: Appointment) => void) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    // 🛡️ HUMAN CHECK - DI: Inject RealTime implementation (SocketIO, SSE, Mock)
    const { realTime } = useDependencies();

    const updateAppointment = useCallback((updatedAppointment: Appointment) => {
        setAppointments(prev => {
            const index = prev.findIndex(t => t.id === updatedAppointment.id);
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
            setConnected(true);
            setError(null);
        });

        realTime.onDisconnect(() => {
            setConnected(false);
        });

        realTime.onError((err) => {
            setError("Error de conexión en tiempo real");
            setConnected(false);
        });

        realTime.onSnapshot((data) => {
            setAppointments(data);
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

    return { appointments, error, connected };
}
