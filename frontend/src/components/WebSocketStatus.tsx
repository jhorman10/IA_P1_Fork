"use client";

import styles from "./WebSocketStatus.module.css";

/**
 * WebSocketStatus - Real-time connection status indicator badge
 *
 * Displays the current WebSocket connection state using a color-coded badge.
 * - 🟢 Green: Connected
 * - 🟡 Yellow: Connecting
 * - 🔴 Red: Disconnected/Error
 *
 * @param status - Connection status: 'connected' | 'connecting' | 'disconnected'
 * @param variant - Badge variant: 'inline' (compact) | 'block' (full-width)
 *
 * @example
 * ```tsx
 * <WebSocketStatus status={connected ? 'connected' : 'disconnected'} variant="inline" />
 * ```
 */
type ConnectionStatus =
  | "connected"
  | "connecting"
  | "reconnecting"
  | "disconnected"
  | "unauthenticated"
  | "auth_rejected"
  | (string & Record<never, never>); // allow other string statuses without breaking type safety
type BadgeVariant = "inline" | "block";

interface WebSocketStatusProps {
  status: ConnectionStatus;
  variant?: BadgeVariant;
}

const StatusConfig: Record<
  string,
  { icon: string; label: string; className: string }
> = {
  connected: {
    icon: "🟢",
    label: "Conectado",
    className: styles.statusConnected,
  },
  connecting: {
    icon: "🟡",
    label: "Conectando...",
    className: styles.statusConnecting,
  },
  reconnecting: {
    icon: "🟡",
    label: "Reconectando...",
    className: styles.statusConnecting,
  },
  disconnected: {
    icon: "🔴",
    label: "Desconectado",
    className: styles.statusDisconnected,
  },
  unauthenticated: {
    icon: "🔴",
    label: "Sin autenticar",
    className: styles.statusDisconnected,
  },
  auth_rejected: {
    icon: "🔴",
    label: "Auth rechazada",
    className: styles.statusDisconnected,
  },
};

export default function WebSocketStatus({
  status,
  variant = "inline",
}: WebSocketStatusProps) {
  const config = StatusConfig[status] ?? StatusConfig.disconnected;
  const isBlock = variant === "block";

  return (
    <div
      className={`${styles.badge} ${config.className} ${
        isBlock ? styles.blockVariant : styles.inlineVariant
      }`}
      data-testid={`websocket-status-${status}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon}>{config.icon}</span>
      <span className={styles.label}>{config.label}</span>
    </div>
  );
}
