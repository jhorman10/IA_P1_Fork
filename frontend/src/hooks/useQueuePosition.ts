"use client";

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
