"use client";

// SPEC-015: useAvailableOffices — fetches free offices for doctor check-in
import { useCallback, useEffect, useRef, useState } from "react";

import { getAvailableOffices } from "@/services/doctorService";

import { useAuth } from "./useAuth";

export interface UseAvailableOfficesReturn {
  offices: string[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAvailableOffices(): UseAvailableOfficesReturn {
  const { token } = useAuth();
  const [offices, setOffices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchOffices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getAvailableOffices(token);
      if (isMountedRef.current) setOffices(data);
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Error al cargar consultorios",
        );
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  return { offices, loading, error, refetch: fetchOffices };
}
