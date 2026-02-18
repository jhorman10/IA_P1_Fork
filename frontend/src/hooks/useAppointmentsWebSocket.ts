"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Appointment } from "@/domain/Appointment";
import { env } from "@/config/env";

/**
 * Real-time hook using WebSocket (Socket.IO).
 */
export function useAppointmentsWebSocket() {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    const socketRef = useRef<Socket | null>(null);

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
        const socket = io(`${env.WS_URL}/ws/appointments`, {
            transports: ["websocket"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: Infinity,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("[WS] Connected to server");
            setConnected(true);
            setError(null);
        });

        socket.on("disconnect", (reason) => {
            console.log(`[WS] Disconnected: ${reason}`);
            setConnected(false);
        });

        socket.on("connect_error", (err: Error | any) => {
            console.error("[WS] Connection error:", err?.message || err);
            setError("Connection error with the server");
            setConnected(false);
        });

        socket.on("APPOINTMENTS_SNAPSHOT", (payload: { type: string; data: Appointment[] }) => {
            console.log(`[WS] Snapshot received: ${payload.data.length} appointments`);
            setAppointments(payload.data);
            setError(null);
        });

        socket.on("APPOINTMENT_UPDATED", (payload: { type: string; data: Appointment }) => {
            console.log(`[WS] Appointment updated: ${payload.data.fullName} → ${payload.data.status}`);
            updateAppointment(payload.data);
        });

        return () => {
            console.log("[WS] Cleanup — disconnecting");
            socket.disconnect();
            socketRef.current = null;
        };
    }, [updateAppointment]);

    return { appointments, error, connected };
}
