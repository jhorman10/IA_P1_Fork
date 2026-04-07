"use client";

import styles from "./QueuePositionBadge.module.css";

interface QueuePositionBadgeProps {
  position: number;
  total: number;
}

export default function QueuePositionBadge({
  position,
  total,
}: QueuePositionBadgeProps) {
  return (
    <span className={styles.badge} data-testid="queue-position-badge">
      Posición {position} de {total}
    </span>
  );
}
