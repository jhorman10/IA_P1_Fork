// SPEC-012: CancelledAppointmentCard — display card for cancelled appointments
import { Appointment } from "@/domain/Appointment";
import { anonymizeName } from "@/lib/anonymizeName";
import styles from "@/styles/page.module.css";

/**
 * Component: CancelledAppointmentCard
 *
 * Specialized component for cancelled appointments (SPEC-012).
 * Shows muted/strikethrough style to distinguish from active appointments.
 *
 * ⚕️ HUMAN CHECK - ISP: Props are ONLY what's relevant for cancelled status
 */
export interface CancelledAppointmentCardProps {
  appointment: Appointment;
  /** SPEC-009: anonymize patient name for public screen (default: true) */
  anonymize?: boolean;
}

function getPriorityBadge(priority: string): string {
  switch (priority) {
    case "high":
      return "🔴 Alta";
    case "medium":
      return "🟡 Media";
    case "low":
    default:
      return "🟢 Baja";
  }
}

export function CancelledAppointmentCard({
  appointment,
  anonymize = true,
}: CancelledAppointmentCardProps) {
  return (
    <li
      className={`${styles.appointmentCard} ${styles.cancelled}`}
      data-testid="cancelled-appointment-card"
    >
      <div className={styles.cardHeader}>
        <span className={styles.nombre}>
          {anonymize
            ? anonymizeName(appointment.fullName)
            : appointment.fullName}
        </span>
        <span
          className={styles.statusBadge}
          data-status="cancelled"
          data-testid="cancelled-badge"
        >
          ❌ Cancelado
        </span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Consultorio:</span>
          <span className={styles.officeBadge}>—</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.label}>Prioridad:</span>
          <span
            className={styles.statusBadge}
            data-status={appointment.priority}
          >
            {getPriorityBadge(appointment.priority)}
          </span>
        </div>
      </div>
    </li>
  );
}
