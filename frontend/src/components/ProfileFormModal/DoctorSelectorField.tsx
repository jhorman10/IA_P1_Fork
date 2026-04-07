// SPEC-014: DoctorSelectorField — readable doctor selector subcomponent for profile form
import { DoctorOption } from "@/hooks/useDoctorOptions";

import styles from "./ProfileFormModal.module.css";

interface DoctorSelectorFieldProps {
  options: DoctorOption[];
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  isEmpty: boolean;
  disabled: boolean;
  error: string | null;
}

export default function DoctorSelectorField({
  options,
  value,
  onChange,
  loading,
  isEmpty,
  disabled,
  error,
}: DoctorSelectorFieldProps) {
  if (loading) {
    return (
      <p className={styles.doctorLoading} aria-live="polite">
        Cargando médicos disponibles…
      </p>
    );
  }

  if (error) {
    return (
      <p className={styles.doctorError} role="alert">
        No se pudo cargar el listado de médicos: {error}
      </p>
    );
  }

  if (isEmpty) {
    return (
      <p className={styles.doctorEmpty} role="alert">
        No hay médicos registrados. Crea un médico antes de vincular este
        perfil.
      </p>
    );
  }

  return (
    <select
      id="doctorId"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={styles.input}
      disabled={disabled}
    >
      <option value="">— Selecciona un médico —</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
