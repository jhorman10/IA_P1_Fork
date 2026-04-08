"use client";

import { useEffect, useState } from "react";

import { Appointment } from "@/domain/Appointment";
import { anonymizeName } from "@/lib/anonymizeName";

import styles from "./AssignmentNotification.module.css";

export interface AssignmentNotificationProps {
  appointment: Appointment;
  onDismiss: () => void;
  anonymize?: boolean;
}

const AUTO_DISMISS_MS = 8000;

export function AssignmentNotification({
  appointment,
  onDismiss,
  anonymize = true,
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

  const displayName = anonymize
    ? anonymizeName(appointment.fullName)
    : appointment.fullName;

  const doctorLine = appointment.doctorName ?? "Médico asignado";
  const officeLine = appointment.office
    ? `Consultorio ${appointment.office}`
    : null;

  return (
    <div
      className={styles.banner}
      role="alert"
      aria-live="assertive"
      data-testid="assignment-notification"
    >
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          🔔
        </span>
        <div className={styles.info}>
          <span className={styles.patientName}>{displayName}</span>
          <span className={styles.detail}>
            👨‍⚕️ {doctorLine}
            {officeLine ? ` · ${officeLine}` : ""}
          </span>
          {appointment.completedAt && (
            <span data-testid="estimated-time" className={styles.estimatedTime}>
              🕐 {new Date(appointment.completedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>
      <button
        className={styles.dismiss}
        onClick={() => {
          setVisible(false);
          onDismiss();
        }}
        aria-label="Cerrar notificación"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}

export default AssignmentNotification;
