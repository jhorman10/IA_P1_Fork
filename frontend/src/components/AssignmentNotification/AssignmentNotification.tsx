"use client";

import { useEffect, useState } from "react";

import { Appointment } from "@/domain/Appointment";

import styles from "./AssignmentNotification.module.css";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * SPEC-003: Toast/banner que aparece cuando un turno pasa de waiting → called.
 * Se auto-descarta tras 8 segundos. El padre puede descartarlo con onDismiss.
 */
export interface AssignmentNotificationProps {
  appointment: Appointment;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 8000;

export function AssignmentNotification({
  appointment,
  onDismiss,
}: AssignmentNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!visible) return null;

  const doctorLine = appointment.doctorName
    ? appointment.doctorName
    : "Médico asignado";

  const officeLine = appointment.office
    ? `Consultorio ${appointment.office}`
    : "";

  const estimatedTime = appointment.completedAt
    ? formatTime(appointment.completedAt)
    : null;

  return (
    <div
      className={styles.notification}
      role="alert"
      aria-live="assertive"
      data-testid="assignment-notification"
    >
      <button
        className={styles.close}
        onClick={() => {
          setVisible(false);
          onDismiss();
        }}
        aria-label="Cerrar notificación"
      >
        ✕
      </button>
      <div className={styles.iconWrapper} aria-hidden="true">
        🔔
      </div>
      <div className={styles.content}>
        <p className={styles.headline}>¡Tu turno fue asignado!</p>
        <p className={styles.patient}>{appointment.fullName}</p>
        <p className={styles.doctor}>
          👨‍⚕️ <strong>{doctorLine}</strong>
        </p>
        {officeLine && <p className={styles.office}>{officeLine}</p>}
        {estimatedTime && (
          <p className={styles.estimatedTime} data-testid="estimated-time">
            ⏰ Hora estimada: <strong>{estimatedTime}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
