import styles from "./DoctorInfo.module.css";

/**
 * SPEC-003: Bloque informativo del médico asignado al turno.
 * Props: doctorName, office
 */
export interface DoctorInfoProps {
  doctorName: string;
  office: string;
}

export function DoctorInfo({ doctorName, office }: DoctorInfoProps) {
  return (
    <div className={styles.container}>
      <span className={styles.icon}>👨‍⚕️</span>
      <div className={styles.details}>
        <span className={styles.name}>{doctorName}</span>
        <span className={styles.office}>Consultorio {office}</span>
      </div>
    </div>
  );
}
