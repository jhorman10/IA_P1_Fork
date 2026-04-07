"use client";

import { Appointment } from "@/domain/Appointment";
import { anonymizeName } from "@/lib/anonymizeName";

import styles from "./AssignmentNotification.module.css";

interface AssignmentNotificationProps {
  appointment: Appointment;
  onDismiss: () => void;
  anonymize?: boolean;
}

export default function AssignmentNotification({
  appointment,
  onDismiss,
  anonymize = true,
}: AssignmentNotificationProps) {
  const displayName = anonymize
    ? anonymizeName(appointment.fullName)
    : appointment.fullName;

  return (
    <div className={styles.banner} role="alert" aria-live="assertive">
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          🔔
        </span>
        <div className={styles.info}>
          <span className={styles.patientName}>{displayName}</span>
          <span className={styles.detail}>
            {appointment.doctorName ?? "—"} &middot;{" "}
            {appointment.office ?? "Pendiente"}
          </span>
        </div>
      </div>
      <button
        className={styles.dismiss}
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}
