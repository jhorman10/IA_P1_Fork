import { anonymizeName } from "@/lib/anonymizeName";
import { Appointment } from "@/domain/Appointment";
import styles from "@/styles/page.module.css";

/**
 * Component: WaitingAppointmentCard
 *
 * Specialized component for appointments awaiting assignment to a consultorio.
 * Props are minimal and type-safe: only what this state needs.
 *
 * ⚕️ HUMAN CHECK - ISP: This component ONLY accepts props relevant to waiting status
 * Props like showTime are NOT available here (they don't make sense for waiting)
 */
export interface WaitingAppointmentCardProps {
  appointment: Appointment;
  timeIcon?: string; // Optional icon override (default: "📝")
  /** SPEC-009: anonymize patient name for public screen (default: true) */
  anonymize?: boolean;
}

// Helper functions (used only in this component)
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

export function WaitingAppointmentCard({
  appointment,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  timeIcon = "📝",
  anonymize = true,
}: WaitingAppointmentCardProps) {
  return (
    <li className={`${styles.appointmentCard} ${styles.waiting}`}>
      <div className={styles.cardHeader}>
        <span className={styles.nombre}>
          {anonymize
            ? anonymizeName(appointment.fullName)
            : appointment.fullName}
        </span>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Consultorio:</span>
          <span className={styles.officeBadge}>Pendiente</span>
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
