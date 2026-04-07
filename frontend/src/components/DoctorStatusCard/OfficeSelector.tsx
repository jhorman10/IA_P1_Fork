"use client";

// SPEC-015: OfficeSelector — selector de consultorio libre para check-in del doctor
import { useEffect, useState } from "react";

import styles from "./OfficeSelector.module.css";

export interface OfficeSelectorProps {
  offices: string[];
  loading: boolean;
  disabled: boolean;
  onConfirm: (office: string) => void;
}

export default function OfficeSelector({
  offices,
  loading,
  disabled,
  onConfirm,
}: OfficeSelectorProps) {
  const [selected, setSelected] = useState("");

  // Reset selection when available offices change (e.g. after refetch)
  useEffect(() => {
    setSelected("");
  }, [offices]);

  if (loading) {
    return (
      <p className={styles.info} data-testid="offices-loading">
        Cargando consultorios...
      </p>
    );
  }

  if (offices.length === 0) {
    return (
      <p className={styles.noOffices} data-testid="no-offices-message">
        No hay consultorios disponibles en este momento
      </p>
    );
  }

  return (
    <div className={styles.wrapper} data-testid="office-selector">
      <select
        className={styles.select}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        disabled={disabled}
        data-testid="office-select"
        aria-label="Seleccionar consultorio"
      >
        <option value="">Seleccionar consultorio...</option>
        {offices.map((o) => (
          <option key={o} value={o}>
            Consultorio {o}
          </option>
        ))}
      </select>
      <button
        className={styles.btnConfirm}
        onClick={() => selected && onConfirm(selected)}
        disabled={disabled || !selected}
        data-testid="btn-confirm-checkin"
      >
        {disabled ? "Procesando..." : "Reportar disponibilidad"}
      </button>
    </div>
  );
}
