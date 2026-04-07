"use client";

// SPEC-013: MetricCard — individual KPI tile
import styles from "./MetricCard.module.css";

export interface MetricCardProps {
  label: string;
  value: string | number;
  variant?: "default" | "success" | "warning" | "muted";
}

export default function MetricCard({
  label,
  value,
  variant = "default",
}: MetricCardProps) {
  return (
    <div
      className={`${styles.card} ${styles[variant] ?? ""}`}
      data-testid="metric-card"
    >
      <span className={styles.value} data-testid="metric-value">
        {value}
      </span>
      <span className={styles.label} data-testid="metric-label">
        {label}
      </span>
    </div>
  );
}
