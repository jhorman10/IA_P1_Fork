"use client";

// SPEC-008: useDoctorDashboard -- doctor status + check-in/check-out actions
// SPEC-012: added completeCurrentAppointment
import { useCallback, useEffect, useRef, useState } from "react";

import { Doctor } from "@/domain/Doctor";
import { completeAppointment } from "@/services/appointmentService";
import {
  checkInDoctor,
  checkOutDoctor,
  getDoctorById,
} from "@/services/doctorService";

import { useAuth } from "./useAuth";

export interface UseDoctorDashboardReturn {
  doctor: Doctor | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  /** SPEC-015: office param required for dynamic office selection */
  checkIn: (office: string) => Promise<void>;
  checkOut: () => Promise<void>;
  /** SPEC-012: marks the given appointment as completed */
  completeCurrentAppointment: (appointmentId: string) => Promise<void>;
  refetch: () => void;
}

export function useDoctorDashboard(): UseDoctorDashboardReturn {
  const { token, profile } = useAuth();
  const doctorId = profile?.doctor_id ?? null;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDoctor = useCallback(async () => {
    if (!doctorId) {
      setError("Perfil no vinculado a un medico. Contacte al administrador.");
      return;
    }
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctorById(doctorId, token);
      if (isMountedRef.current) setDoctor(data);
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar datos del medico",
        );
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [token, doctorId]);

  useEffect(() => {
    fetchDoctor();
  }, [fetchDoctor]);

  const checkIn = useCallback(
    async (office: string) => {
      if (!token || !doctorId) return;
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        const data = await checkInDoctor(doctorId, token, office);
        if (isMountedRef.current) {
          setDoctor(data);
          setSuccessMessage("Check-in realizado correctamente");
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Error al hacer check-in",
          );
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token, doctorId],
  );

  const checkOut = useCallback(async () => {
    if (!token || !doctorId) return;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const data = await checkOutDoctor(doctorId, token);
      if (isMountedRef.current) {
        setDoctor(data);
        setSuccessMessage("Check-out realizado correctamente");
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Error al hacer check-out",
        );
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [token, doctorId]);

  const completeCurrentAppointment = useCallback(
    async (appointmentId: string) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      try {
        await completeAppointment(appointmentId, token);
        if (isMountedRef.current) {
          setSuccessMessage("Atención finalizada correctamente");
          // Refresh doctor status — backend will transition busy → available
          await fetchDoctor();
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Error al finalizar atención",
          );
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token, fetchDoctor],
  );

  return {
    doctor,
    loading,
    error,
    successMessage,
    checkIn,
    checkOut,
    completeCurrentAppointment,
    refetch: fetchDoctor,
  };
}
