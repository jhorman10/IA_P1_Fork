"use client";

// SPEC-016: useOfficeCatalog — CRUD state for the offices catalog
import { useCallback, useEffect, useRef, useState } from "react";

import { Office } from "@/domain/Office";
import {
  applyOfficeCapacity,
  getOffices,
  updateOfficeEnabled,
} from "@/services/officeService";

import { useAuth } from "./useAuth";

export interface UseOfficeCatalogReturn {
  items: Office[];
  loading: boolean;
  error: string | null;
  applyCapacity: (targetTotal: number) => Promise<boolean>;
  toggleEnabled: (number: string, enabled: boolean) => Promise<boolean>;
  refetch: () => void;
}

export function useOfficeCatalog(options?: {
  enabled?: boolean;
}): UseOfficeCatalogReturn {
  const enabled = options?.enabled ?? true;
  const { token } = useAuth();
  const [items, setItems] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOffices(token);
      if (isMountedRef.current) setItems(data);
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
    if (!enabled) return;
    fetchAll();
  }, [fetchAll, enabled]);

  const applyCapacity = useCallback(
    async (targetTotal: number): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      setError(null);
      try {
        await applyOfficeCapacity({ target_total: targetTotal }, token);
        const data = await getOffices(token);
        if (isMountedRef.current) setItems(data);
        return true;
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al actualizar capacidad",
          );
        }
        return false;
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token],
  );

  const toggleEnabled = useCallback(
    async (number: string, enabled: boolean): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      setError(null);
      try {
        const updated = await updateOfficeEnabled(number, { enabled }, token);
        if (isMountedRef.current) {
          setItems((prev) =>
            prev.map((o) => (o.number === number ? { ...o, ...updated } : o)),
          );
        }
        return true;
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al actualizar consultorio",
          );
        }
        return false;
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token],
  );

  return {
    items,
    loading,
    error,
    applyCapacity,
    toggleEnabled,
    refetch: fetchAll,
  };
}
