"use client";

import styles from "./QueuePositionBadge.module.css";

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
      data-testid="queue-position-badge"
      aria-label={`Posición ${position} de ${total}`}
    >
      🔢 Pos. <strong>{position}</strong> / {total}
    </span>
  );
}

export default QueuePositionBadge;
