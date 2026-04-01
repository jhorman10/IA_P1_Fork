import styles from "./QueuePositionBadge.module.css";

/**
 * SPEC-003: Badge que muestra la posición del paciente en la cola de espera.
 * Props: position (1-based), total (total en espera)
 */
export interface QueuePositionBadgeProps {
  position: number;
  total: number;
}

export function QueuePositionBadge({
  position,
  total,
}: QueuePositionBadgeProps) {
  return (
    <span
      className={styles.badge}
      aria-label={`Posición ${position} de ${total}`}
    >
      🔢 Pos. <strong>{position}</strong> / {total}
    </span>
  );
}
