"use client";

// SPEC-011: AuditLogTable — read-only table of audit log entries with pagination
import { AuditLogEntry } from "@/domain/AuditLog";
import { Profile } from "@/domain/Profile";

import styles from "./AuditLogTable.module.css";

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  loading: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  profilesByUid?: Record<string, Profile>;
  limit: number;
  limitOptions: number[];
  onLimitChange: (limit: number) => void;
}

function formatTimestamp(epoch: number): string {
  return new Date(epoch).toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function AuditLogTable({
  logs,
  loading,
  page,
  totalPages,
  total,
  onPageChange,
  profilesByUid = {},
  limit,
  limitOptions,
  onLimitChange,
}: AuditLogTableProps) {
  return (
    <div data-testid="audit-log-table">
      <div className={styles.tableWrapper}>
        {loading ? (
          <p className={styles.loadingText} data-testid="audit-table-loading">
            Cargando registros…
          </p>
        ) : logs.length === 0 ? (
          <p className={styles.emptyState} data-testid="audit-table-empty">
            No se encontraron registros de auditoría.
          </p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Acción</th>
                <th>Actor</th>
                <th>Objetivo</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className={styles.nowrap}>
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td>
                    <span className={styles.actionBadge}>{log.action}</span>
                  </td>
                  <td>
                    {profilesByUid[log.actorUid] ? (
                      <div className={styles.actorCell}>
                        <span className={styles.actorName}>
                          {profilesByUid[log.actorUid].display_name}
                        </span>
                        <span className={styles.actorEmail}>
                          {profilesByUid[log.actorUid].email}
                        </span>
                      </div>
                    ) : (
                      <span className={styles.uid}>{log.actorUid}</span>
                    )}
                  </td>
                  <td className={styles.uid}>
                    {log.targetUid ?? log.targetId ?? (
                      <span className={styles.na}>—</span>
                    )}
                  </td>
                  <td className={styles.detail}>
                    <code>{JSON.stringify(log.details)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && total > 0 && (
        <div className={styles.pagination} data-testid="audit-pagination">
          <div className={styles.limitSelector}>
            <label className={styles.limitLabel} htmlFor="audit-limit-select">
              Filas por página:
            </label>
            <select
              id="audit-limit-select"
              className={styles.limitSelect}
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              data-testid="audit-limit-select"
              aria-label="Filas por página"
            >
              {limitOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Página anterior"
          >
            ← Anterior
          </button>
          <span className={styles.pageInfo}>
            Página {page} de {totalPages} ({total} registros)
          </span>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
