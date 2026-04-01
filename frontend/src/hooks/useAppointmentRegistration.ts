"use client";

import { useEffect, useRef, useState } from "react";

import { useDependencies } from "@/context/DependencyContext";
import { CreateAppointmentDTO } from "@/domain/CreateAppointment";

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
   * Repository from DI Context (stable, no need for ref)
   * ⚕️ HUMAN CHECK - H-36: DependencyContext es estable, no requiere useRef
   */
  const { repository } = useDependencies();

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
  const safeSet = <T>(setter: (v: T) => void, value: T) => {
    if (isMountedRef.current) setter(value);
  };

  const register = async (data: CreateAppointmentDTO): Promise<boolean> => {
    if (inFlightRef.current) return false;

    inFlightRef.current = true;

    safeSet(setLoading, true);
    safeSet(setSuccess, null);
    safeSet(setError, null);

    try {
      const res = await repository.createAppointment(data);

      safeSet(setSuccess, res.message ?? "Turno registrado exitosamente.");
      return true;
    } catch (err: unknown) {
      const errorCode = err instanceof Error ? err.message : "UNKNOWN_ERROR";
      // Si el servidor envió un mensaje específico, mostrarlo directamente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const serverMessage = (err as any)?.serverMessage;

      let userMessage =
        serverMessage ?? "No se pudo registrar el turno. Intente de nuevo.";

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
      return false;
    } finally {
      safeSet(setLoading, false);
      inFlightRef.current = false;
    }
  };

  return { register, loading, success, error, isSubmitting: loading };
}
