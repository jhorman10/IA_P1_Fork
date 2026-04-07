"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { env } from "@/config/env";

export function useQueuePosition(idCard?: string | number | null) {
  const [position, setPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);

  const fetchPosition = useCallback(async () => {
    if (!idCard) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${env.API_BASE_URL}/appointments/queue-position/${idCard}`,
      );
      if (!res.ok) throw new Error("HTTP_ERROR");
      const body = await res.json();
      setPosition(body?.position ?? null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "UNKNOWN_ERROR");
    } finally {
      setLoading(false);
    }
  }, [idCard]);

  useEffect(() => {
    if (!idCard) {
      setPosition(null);
      setError(null);
      return;
    }

    // Initial fetch
    fetchPosition();

    // Polling
    intervalRef.current = window.setInterval(
      fetchPosition,
      Number(env.POLLING_INTERVAL),
    );

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [idCard, fetchPosition]);

  return { position, loading, error, refresh: fetchPosition } as const;
}
("use client");

import { useCallback, useEffect, useState } from "react";

import { getQueuePosition } from "@/services/appointmentService";

/**
 * SPEC-003: Hook para consultar la posición en cola de un paciente.
 * Se vuelve a consultar automáticamente cuando `refreshSignal` cambia
 * (e.g. pasar `appointments.length` o un contador de actualizaciones WebSocket).
 */
export function useQueuePosition(
  idCard: number | null,
  refreshSignal?: number,
) {
  const [position, setPosition] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!idCard) return;
    setLoading(true);
    try {
      const data = await getQueuePosition(idCard);
      setPosition(data.position);
      setTotal(data.total);
      setError(null);
    } catch {
      setError("Error al obtener posición en cola");
    } finally {
      setLoading(false);
    }
  }, [idCard]);

  useEffect(() => {
    fetch();
  }, [fetch, refreshSignal]);

  return { position, total, loading, error, refetch: fetch };
}
