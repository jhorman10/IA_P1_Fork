"use client";

// SPEC-015: useSpecialties — CRUD state for the specialties catalog
import { useCallback, useEffect, useRef, useState } from "react";

import { Specialty } from "@/domain/Specialty";
import {
  createSpecialty,
  deleteSpecialty,
  getSpecialties,
  updateSpecialty,
} from "@/services/specialtyService";

import { useAuth } from "./useAuth";

export interface UseSpecialtiesReturn {
  items: Specialty[];
  loading: boolean;
  error: string | null;
  create: (name: string) => Promise<boolean>;
  update: (id: string, name: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  refetch: () => void;
}

export function useSpecialties(options?: {
  enabled?: boolean;
}): UseSpecialtiesReturn {
  const enabled = options?.enabled ?? true;
  const { token } = useAuth();
  const [items, setItems] = useState<Specialty[]>([]);
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
      const data = await getSpecialties(token);
      if (isMountedRef.current) setItems(data);
    } catch (err) {
      if (isMountedRef.current) {
        setError(
          err instanceof Error ? err.message : "Error al cargar especialidades",
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

  const create = useCallback(
    async (name: string): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      setError(null);
      try {
        const created = await createSpecialty({ name }, token);
        if (isMountedRef.current) setItems((prev) => [...prev, created]);
        return true;
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Error al crear especialidad",
          );
        }
        return false;
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token],
  );

  const update = useCallback(
    async (id: string, name: string): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      setError(null);
      try {
        const updated = await updateSpecialty(id, { name }, token);
        if (isMountedRef.current) {
          setItems((prev) => prev.map((s) => (s.id === id ? updated : s)));
        }
        return true;
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al actualizar especialidad",
          );
        }
        return false;
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      setError(null);
      try {
        await deleteSpecialty(id, token);
        if (isMountedRef.current) {
          setItems((prev) => prev.filter((s) => s.id !== id));
        }
        return true;
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al eliminar especialidad",
          );
        }
        return false;
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token],
  );

  return { items, loading, error, create, update, remove, refetch: fetchAll };
}
