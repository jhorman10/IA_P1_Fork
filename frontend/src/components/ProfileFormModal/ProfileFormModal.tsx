"use client";

// SPEC-004: ProfileFormModal — create / edit an operational profile
// SPEC-015: specialty selector replaces doctor-id selector for doctor role
import { useEffect, useState } from "react";

import {
  CreateProfileDTO,
  Profile,
  UpdateProfileDTO,
  UserRole,
} from "@/domain/Profile";
import { useDoctorOptions } from "@/hooks/useDoctorOptions";
import { useSpecialties } from "@/hooks/useSpecialties";
import { sanitizeText } from "@/security/sanitize";

import styles from "./ProfileFormModal.module.css";

interface ProfileFormModalProps {
  isOpen: boolean;
  initialData?: Profile | null;
  onSubmit: (data: CreateProfileDTO | UpdateProfileDTO) => Promise<boolean>;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

const ROLES: UserRole[] = ["admin", "recepcionista", "doctor"];

export default function ProfileFormModal({
  isOpen,
  initialData,
  onSubmit,
  onClose,
  loading,
  error,
}: ProfileFormModalProps) {
  const isEditing = !!initialData;

  // useDoctorOptions is kept for edit-mode specialty pre-selection lookup
  // (Profile stores doctor_id; backend resolves specialtyId via Doctor entity)
  const { doctors: allDoctors } = useDoctorOptions();

  const {
    items: specialties,
    loading: specialtiesLoading,
    error: specialtiesError,
  } = useSpecialties({ enabled: isOpen });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("recepcionista");
  const [specialtyId, setSpecialtyId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset fields when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      setEmail(initialData.email);
      setPassword("");
      setDisplayName(initialData.display_name);
      setRole(initialData.role);
      setSpecialtyId(""); // resolved below once doctors load
      setStatus(initialData.status);
    } else {
      setEmail("");
      setPassword("");
      setDisplayName("");
      setRole("recepcionista");
      setSpecialtyId("");
      setStatus("active");
    }
    setValidationError(null);
  }, [initialData, isOpen]);

  // CRITERIO-1.2: pre-select specialty in edit mode once doctor list is loaded
  useEffect(() => {
    if (
      !initialData ||
      initialData.role !== "doctor" ||
      !initialData.doctor_id ||
      allDoctors.length === 0
    )
      return;
    const linkedDoctor = allDoctors.find((d) => d.id === initialData.doctor_id);
    if (linkedDoctor?.specialtyId) {
      setSpecialtyId(linkedDoctor.specialtyId);
    }
  }, [allDoctors, initialData]);

  if (!isOpen) return null;

  const specialtiesEmpty = !specialtiesLoading && specialties.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const safeName = sanitizeText(displayName).trim();
    const safeEmail = sanitizeText(email).trim();

    if (!isEditing) {
      if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
        setValidationError("Ingresa un correo electrónico válido.");
        return;
      }
      if (!password || password.length < 6) {
        setValidationError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
    }

    if (!safeName) {
      setValidationError("El nombre visible es obligatorio.");
      return;
    }

    if (role === "doctor" && specialtiesEmpty) {
      setValidationError(
        "No hay especialidades registradas. Crear una primero.",
      );
      return;
    }

    if (role === "doctor" && !specialtyId) {
      setValidationError("Debe seleccionar una especialidad.");
      return;
    }

    const payload = isEditing
      ? ({
          role,
          status,
          specialty_id: role === "doctor" ? specialtyId || null : null,
        } as UpdateProfileDTO)
      : ({
          email: safeEmail,
          password,
          display_name: safeName,
          role,
          specialty_id: role === "doctor" ? specialtyId || null : null,
        } as CreateProfileDTO);

    const ok = await onSubmit(payload);
    if (ok) onClose();
  };

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      data-testid="profile-form-modal"
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {isEditing ? "Editar Perfil" : "Nuevo Perfil"}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isEditing && (
            <>
              <label className={styles.label} htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                disabled={loading}
                placeholder="usuario@clinic.local"
                autoComplete="off"
              />

              <label className={styles.label} htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                disabled={loading}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                minLength={6}
              />
            </>
          )}

          <label className={styles.label} htmlFor="displayName">
            Nombre visible
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={styles.input}
            disabled={loading}
            maxLength={100}
            placeholder="Ej. Recepción Principal"
          />

          <label className={styles.label} htmlFor="role">
            Rol
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className={styles.input}
            disabled={loading}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {role === "doctor" && (
            <>
              <label className={styles.label} htmlFor="specialtyId">
                Especialidad
              </label>
              {specialtiesLoading ? (
                <p className={styles.hint}>Cargando especialidades...</p>
              ) : specialtiesError ? (
                <p className={styles.error} role="alert">
                  {specialtiesError}
                </p>
              ) : specialtiesEmpty ? (
                <p className={styles.hint} data-testid="no-specialties-msg">
                  No hay especialidades registradas. Crear una primero.
                </p>
              ) : (
                <select
                  id="specialtyId"
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className={styles.input}
                  disabled={loading}
                  aria-label="Especialidad"
                  data-testid="specialty-select"
                >
                  <option value="">Seleccionar especialidad...</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {isEditing && (
            <>
              <label className={styles.label} htmlFor="status">
                Estado
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "inactive")
                }
                className={styles.input}
                disabled={loading}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </>
          )}

          {(validationError || error) && (
            <p className={styles.error} role="alert">
              {validationError || error}
            </p>
          )}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || (role === "doctor" && specialtiesEmpty)}
            >
              {loading
                ? "Guardando..."
                : isEditing
                  ? "Guardar cambios"
                  : "Crear perfil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
