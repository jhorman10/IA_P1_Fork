"use client";

// SPEC-011: Admin Audit Page — read-only audit log viewer (admin only)
import { useCallback, useMemo } from "react";

import AuditFilters from "@/components/AuditFilters/AuditFilters";
import AuditLogTable from "@/components/AuditLogTable/AuditLogTable";
import { Profile } from "@/domain/Profile";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { useAuth } from "@/hooks/useAuth";
import { useProfiles } from "@/hooks/useProfiles";
import { useRoleGuard } from "@/hooks/useRoleGuard";

import styles from "./page.module.css";

export default function AdminAuditPage() {
  const { profile: currentUser } = useAuth();
  const { allowed } = useRoleGuard(["admin"]);
  const { items: profiles } = useProfiles();
  const {
    logs,
    total,
    page,
    totalPages,
    loading,
    error,
    filters,
    setFilters,
    fetchLogs,
  } = useAuditLogs();

  const profilesByUid: Record<string, Profile> = useMemo(
    () =>
      profiles.reduce(
        (map, p) => {
          map[p.uid] = p;
          return map;
        },
        {} as Record<string, Profile>,
      ),
    [profiles],
  );

  const handleFilterChange = useCallback(
    (newFilters: typeof filters) => {
      if (newFilters.actorSearch) {
        const search = newFilters.actorSearch.toLowerCase();
        const match = profiles.find(
          (p) =>
            p.display_name?.toLowerCase().includes(search) ||
            p.email?.toLowerCase().includes(search),
        );
        setFilters({ ...newFilters, actorUid: match?.uid });
      } else {
        setFilters({ ...newFilters, actorUid: undefined });
      }
    },
    [profiles, setFilters],
  );

  if (!allowed) return null;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Trazabilidad Operativa</h1>
          <p className={styles.subheading}>
            Bienvenido, {currentUser?.display_name ?? currentUser?.email}
          </p>
        </div>
      </header>

      {error && (
        <div className={styles.error} role="alert">
          {error}
        </div>
      )}

      <AuditFilters filters={filters} onFilterChange={handleFilterChange} />

      <AuditLogTable
        logs={logs}
        loading={loading}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={fetchLogs}
        profilesByUid={profilesByUid}
      />
    </main>
  );
}
