"use client";

// SPEC-014: useDoctorOptions — loads doctor catalog for readable profile form selector
import { useCallback, useEffect, useRef, useState } from "react";

import { Doctor } from "@/domain/Doctor";
import { getDoctors } from "@/services/doctorService";

import { useAuth } from "./useAuth";

export interface DoctorOption {
  value: string;
  label: string;
}

export interface UseDoctorOptionsReturn {
  options: DoctorOption[];
  doctors: Doctor[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  refetch: () => void;
}

function buildLabel(doctor: Doctor): string {
  const parts = [doctor.name, doctor.specialty];
  if (doctor.office) parts.push(`Consultorio ${doctor.office}`);
  return parts.join(" · ");
}

export function useDoctorOptions(): UseDoctorOptionsReturn {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchDoctors = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctors(undefined, token);
      if (isMountedRef.current) {
        setDoctors(data);
        setHasFetched(true);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Error al cargar médicos",
        );
        setHasFetched(true);
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const options: DoctorOption[] = doctors.map((d) => ({
    value: d.id,
    label: buildLabel(d),
  }));

  return {
    options,
    doctors,
    loading,
    error,
    isEmpty: hasFetched && !loading && error === null && doctors.length === 0,
    refetch: fetchDoctors,
  };
}
