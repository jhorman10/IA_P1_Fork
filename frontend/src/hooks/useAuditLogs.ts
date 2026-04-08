"use client";

// SPEC-011: useAuditLogs — paginated query for GET /audit-logs
import { useCallback, useEffect, useRef, useState } from "react";

import { AuditLogEntry, AuditLogFilters } from "@/domain/AuditLog";
import { getAuditLogs } from "@/services/auditService";

import { useAuth } from "./useAuth";

const DEFAULT_LIMIT = 5;
const LIMIT_OPTIONS = [5, 10, 15];

export interface UseAuditLogsReturn {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  filters: AuditLogFilters;
  setFilters: (f: AuditLogFilters) => void;
  fetchLogs: (page?: number) => void;
  limit: number;
  limitOptions: number[];
  setLimit: (limit: number) => void;
}

export function useAuditLogs(): UseAuditLogsReturn {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AuditLogFilters>({});
  const [limit, setLimitState] = useState(DEFAULT_LIMIT);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchLogs = useCallback(
    async (targetPage = 1) => {
      if (!token) return;
      if (!isMountedRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const response = await getAuditLogs(token, {
          ...filters,
          page: targetPage,
          limit,
        });
        if (isMountedRef.current) {
          setLogs(response.data);
          setTotal(response.total);
          setPage(response.page);
          setTotalPages(response.totalPages);
        }
      } catch (err) {
        if (isMountedRef.current) {
          setError(
            err instanceof Error ? err.message : "Error al cargar audit logs",
          );
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [token, filters, limit],
  );

  const setFilters = useCallback((f: AuditLogFilters) => {
    setFiltersState(f);
    setPage(1);
  }, []);

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(newLimit);
    setPage(1);
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [fetchLogs]);

  return {
    logs,
    total,
    page,
    totalPages,
    loading,
    error,
    filters,
    setFilters,
    fetchLogs,
    limit,
    limitOptions: LIMIT_OPTIONS,
    setLimit,
  };
}
