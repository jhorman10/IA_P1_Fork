"use client";

// SPEC-008: DoctorStatusCard -- displays doctor status and check-in/check-out buttons
// SPEC-015: OfficeSelector integrated for dynamic office assignment at check-in
import { Doctor } from "@/domain/Doctor";

import styles from "./DoctorStatusCard.module.css";
import OfficeSelector from "./OfficeSelector";

export interface DoctorStatusCardProps {
  doctor: Doctor;
  onCheckIn: (office: string) => void;
  onCheckOut: () => void;
  loading: boolean;
  availableOffices: string[];
  officesLoading: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  available: "Disponible",
  busy: "En atencion",
  offline: "Fuera de consultorio",
};

export default function DoctorStatusCard({
  doctor,
  onCheckIn,
  onCheckOut,
  loading,
  availableOffices,
  officesLoading,
}: DoctorStatusCardProps) {
  return (
    <div className={styles.card} data-testid="doctor-status-card">
      <div className={styles.info}>
        <h2 className={styles.name}>{doctor.name}</h2>
        <p className={styles.office}>
          {doctor.office
            ? `Consultorio ${doctor.office}`
            : "Sin consultorio asignado"}
        </p>
        <p className={styles.specialty}>{doctor.specialty}</p>
      </div>

      <div className={styles.statusRow}>
        <span
          className={`${styles.badge} ${styles[doctor.status] ?? ""}`}
          data-testid="doctor-status-badge"
        >
          {STATUS_LABEL[doctor.status] ?? doctor.status}
        </span>
      </div>

      <div className={styles.actions}>
        {doctor.status === "offline" ? (
          <OfficeSelector
            offices={availableOffices}
            loading={officesLoading}
            disabled={loading}
            onConfirm={onCheckIn}
          />
        ) : (
          <button
            className={styles.btnCheckOut}
            onClick={onCheckOut}
            disabled={loading}
            data-testid="btn-check-out"
          >
            Salir de consultorio
          </button>
        )}
      </div>
    </div>
  );
}
