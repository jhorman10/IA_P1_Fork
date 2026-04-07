"use client";

// SPEC-004: useProfiles — admin profile management state
import { useCallback, useEffect, useRef, useState } from "react";

import { CreateProfileDTO, Profile, UpdateProfileDTO } from "@/domain/Profile";
import {
  createProfile,
  getProfiles,
  updateProfile,
} from "@/services/profileService";

import { useAuth } from "./useAuth";

export interface UseProfilesReturn {
  items: Profile[];
  loading: boolean;
  error: string | null;
  create: (data: CreateProfileDTO) => Promise<boolean>;
  update: (uid: string, data: UpdateProfileDTO) => Promise<boolean>;
  refetch: () => void;
}

export function useProfiles(): UseProfilesReturn {
  const { token } = useAuth();
  const [items, setItems] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProfiles = useCallback(async () => {
    if (!token) return;
    if (!isMountedRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getProfiles(token);
      if (isMountedRef.current) setItems(response.data);
    } catch (err) {
      if (isMountedRef.current)
        setError(
          err instanceof Error ? err.message : "Error al cargar perfiles",
        );
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const create = useCallback(
    async (data: CreateProfileDTO): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      setError(null);
      try {
        await createProfile(data, token);
        await fetchProfiles();
        return true;
      } catch (err) {
        if (isMountedRef.current)
          setError(
            err instanceof Error ? err.message : "Error al crear perfil",
          );
        return false;
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token, fetchProfiles],
  );

  const update = useCallback(
    async (uid: string, data: UpdateProfileDTO): Promise<boolean> => {
      if (!token) return false;
      setLoading(true);
      setError(null);
      try {
        await updateProfile(uid, data, token);
        await fetchProfiles();
        return true;
      } catch (err) {
        if (isMountedRef.current)
          setError(
            err instanceof Error ? err.message : "Error al actualizar perfil",
          );
        return false;
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token, fetchProfiles],
  );

  return { items, loading, error, create, update, refetch: fetchProfiles };
}
