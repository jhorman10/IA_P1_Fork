"use client";

// SPEC-011: AuditFilters — filter controls for the audit log page
import { AuditAction, AuditLogFilters } from "@/domain/AuditLog";

import styles from "./AuditFilters.module.css";

const AUDIT_ACTIONS: AuditAction[] = [
  "PROFILE_CREATED",
  "PROFILE_UPDATED",
  "DOCTOR_CHECK_IN",
  "DOCTOR_CHECK_OUT",
  "DOCTOR_CREATED",
  "APPOINTMENT_CREATED",
  "SESSION_RESOLVED",
];

interface AuditFiltersProps {
  filters: AuditLogFilters;
  onFilterChange: (filters: AuditLogFilters) => void;
}

export default function AuditFilters({
  filters,
  onFilterChange,
}: AuditFiltersProps) {
  const handleAction = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as AuditAction | "";
    onFilterChange({ ...filters, action: value || undefined });
  };

  const handleActorSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ ...filters, actorSearch: e.target.value || undefined });
  };

  const handleFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const epoch = e.target.value
      ? new Date(e.target.value).getTime()
      : undefined;
    onFilterChange({ ...filters, from: epoch });
  };

  const handleTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const epoch = e.target.value
      ? new Date(e.target.value + "T23:59:59").getTime()
      : undefined;
    onFilterChange({ ...filters, to: epoch });
  };

  const epochToDateInput = (epoch?: number) => {
    if (!epoch) return "";
    return new Date(epoch).toISOString().split("T")[0];
  };

  return (
    <div className={styles.container} data-testid="audit-filters">
      <div className={styles.field}>
        <label htmlFor="audit-action-filter" className={styles.label}>
          Acción
        </label>
        <select
          id="audit-action-filter"
          className={styles.select}
          value={filters.action ?? ""}
          onChange={handleAction}
        >
          <option value="">Todas las acciones</option>
          {AUDIT_ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="audit-actor-filter" className={styles.label}>
          Actor
        </label>
        <input
          id="audit-actor-filter"
          type="text"
          className={styles.input}
          placeholder="Nombre o Correo"
          value={filters.actorSearch ?? ""}
          onChange={handleActorSearch}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="audit-from-filter" className={styles.label}>
          Desde
        </label>
        <input
          id="audit-from-filter"
          type="date"
          className={styles.input}
          value={epochToDateInput(filters.from)}
          onChange={handleFrom}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="audit-to-filter" className={styles.label}>
          Hasta
        </label>
        <input
          id="audit-to-filter"
          type="date"
          className={styles.input}
          value={epochToDateInput(filters.to)}
          onChange={handleTo}
        />
      </div>
    </div>
  );
}
