"use client";

// SPEC-013: useOperationalMetrics — fetch metrics with 30s auto-refresh
import { useCallback, useEffect, useRef, useState } from "react";

import { OperationalMetrics } from "@/domain/OperationalMetrics";
import { getOperationalMetrics } from "@/services/metricsService";

import { useAuth } from "./useAuth";

const REFRESH_INTERVAL_MS = 30_000;

export interface UseOperationalMetricsReturn {
  metrics: OperationalMetrics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOperationalMetrics(): UseOperationalMetricsReturn {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchMetrics = useCallback(async () => {
    if (!token) return;
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOperationalMetrics(token);
      if (isMountedRef.current) {
        setMetrics(data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Error al cargar métricas",
        );
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMetrics();
    const intervalId = setInterval(fetchMetrics, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}
