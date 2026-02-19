"use client";

import { useRef, useState, useEffect } from "react";
import { CreateAppointmentDTO } from "@/domain/CreateAppointment";
import { useDependencies } from "@/context/DependencyContext";

/**
 * Hook for registering appointments.
 *
 * Features:
 * - Prevents double submit
 * - Prevents setState after unmount
 * - Typed error handling
 * - State reset before each request
 * - Repository singleton (no recreation)
 * - No memory leaks
 * - Circuit Breaker compatible
 */
export function useAppointmentRegistration() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    /**
     * Hook lifecycle control
     */
    const isMountedRef = useRef(true);

    /**
     * Prevents multiple simultaneous submits
     */
    const inFlightRef = useRef(false);

    /**
     * Repository singleton
     */
    const { repository } = useDependencies();
    const repositoryRef = useRef(repository); // Keep ref for stability or just use repository directly? DependencyContext is stable.

    // 🛡️ HUMAN CHECK - DIP: Hook uses injected repository, not class.


    useEffect(() => {
        // Resetear inFlightRef en cada mount (evita bloqueo tras Fast Refresh o remount)
        isMountedRef.current = true;
        inFlightRef.current = false;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    /**
     * Safe state update (prevents setState after unmount)
     */
    const safeSet = <T,>(setter: (v: T) => void, value: T) => {
        if (isMountedRef.current) setter(value);
    };

    const register = async (data: CreateAppointmentDTO) => {
        if (inFlightRef.current) return;

        inFlightRef.current = true;

        safeSet(setLoading, true);
        safeSet(setSuccess, null);
        safeSet(setError, null);

        try {
            const res = await repositoryRef.current!.createAppointment(data);

            safeSet(
                setSuccess,
                res.message ?? "Turno registrado exitosamente."
            );
        } catch (err: unknown) {
            const errorCode = err instanceof Error ? err.message : "UNKNOWN_ERROR";
            // Si el servidor envió un mensaje específico, mostrarlo directamente
            const serverMessage = (err as any)?.serverMessage;

            let userMessage = serverMessage ?? "No se pudo registrar el turno. Intente de nuevo.";

            if (!serverMessage) {
                switch (errorCode) {
                    case "TIMEOUT":
                        userMessage = "El servidor tardó demasiado. Intente de nuevo.";
                        break;
                    case "RATE_LIMIT":
                        userMessage = "Demasiadas solicitudes. Espere unos segundos.";
                        break;
                    case "SERVER_ERROR":
                        userMessage = "Error en el servidor. Intente más tarde.";
                        break;
                    case "CIRCUIT_OPEN":
                        userMessage = "Servidor temporalmente no disponible.";
                        break;
                }
            }

            safeSet(setError, userMessage);
        } finally {
            safeSet(setLoading, false);
            inFlightRef.current = false;
        }
    };

    return { register, loading, success, error };
}
