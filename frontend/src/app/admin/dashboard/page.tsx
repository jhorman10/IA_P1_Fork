"use client";

// SPEC-013: Admin Dashboard Page — operational metrics (admin only)
import MetricsGrid from "@/components/MetricsGrid/MetricsGrid";
import { useAuth } from "@/hooks/useAuth";
import { useOperationalMetrics } from "@/hooks/useOperationalMetrics";
import { useRoleGuard } from "@/hooks/useRoleGuard";

import styles from "./page.module.css";

export default function AdminDashboardPage() {
  const { profile: currentUser } = useAuth();
  const { allowed } = useRoleGuard(["admin"]);
  const { metrics, loading, error } = useOperationalMetrics();

  if (!allowed) return null;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Dashboard Operativo</h1>
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

      {loading && !metrics && (
        <p className={styles.loadingState} role="status" aria-live="polite">
          Cargando métricas…
        </p>
      )}

      {metrics && <MetricsGrid metrics={metrics} />}

      {!loading && !metrics && !error && (
        <div className={styles.emptyState}>Sin datos disponibles.</div>
      )}
    </main>
  );
}
