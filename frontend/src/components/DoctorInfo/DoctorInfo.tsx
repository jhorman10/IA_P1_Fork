"use client";

import styles from "./DoctorInfo.module.css";

interface DoctorInfoProps {
  doctorName: string;
  office: string;
}

export default function DoctorInfo({ doctorName, office }: DoctorInfoProps) {
  return (
    <div className={styles.block} data-testid="doctor-info">
      <div className={styles.row}>
        <span className={styles.label}>Médico:</span>
        <span className={styles.value}>{doctorName}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>Consultorio:</span>
        <span className={styles.value}>{office}</span>
      </div>
    </div>
  );
}
