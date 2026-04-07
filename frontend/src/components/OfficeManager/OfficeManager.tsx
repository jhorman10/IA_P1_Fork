"use client";

// SPEC-016: OfficeManager — gestión inline del catálogo de consultorios para admin
import { useState } from "react";

import { Office } from "@/domain/Office";
import { UseOfficeCatalogReturn } from "@/hooks/useOfficeCatalog";

import styles from "./OfficeManager.module.css";

interface OfficeManagerProps {
  items: Office[];
  loading: boolean;
  error: string | null;
  onApplyCapacity: UseOfficeCatalogReturn["applyCapacity"];
  onToggleEnabled: UseOfficeCatalogReturn["toggleEnabled"];
}

export default function OfficeManager({
  items,
  loading,
  error,
  onApplyCapacity,
  onToggleEnabled,
}: OfficeManagerProps) {
  const sorted = [...items].sort((a, b) => Number(a.number) - Number(b.number));
  const currentMax =
    items.length > 0 ? Math.max(...items.map((o) => Number(o.number))) : 0;

  const enabledCount = items.filter((o) => o.enabled).length;
  const disabledCount = items.filter((o) => !o.enabled).length;
  const occupiedCount = items.filter((o) => o.occupied).length;
  const freeCount = items.filter((o) => o.enabled && !o.occupied).length;

  const [targetInput, setTargetInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleApplyCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const target = parseInt(targetInput, 10);
    if (isNaN(target) || target < 1) {
      setLocalError("Ingresa un número válido mayor a 0.");
      return;
    }
    if (target < currentMax) {
      setLocalError(
        `La reducción de capacidad se realiza deshabilitando consultorios individualmente. El máximo actual es ${currentMax}.`,
      );
      return;
    }
    const ok = await onApplyCapacity(target);
    if (ok) setTargetInput("");
  };

  const handleToggle = async (office: Office) => {
    setLocalError(null);
    if (!office.enabled) {
      await onToggleEnabled(office.number, true);
    } else {
      if (office.occupied) return;
      await onToggleEnabled(office.number, false);
    }
  };

  return (
    <section className={styles.section} data-testid="office-manager">
      <h3 className={styles.title}>Catálogo de Consultorios</h3>

      <div className={styles.summary} data-testid="office-summary">
        <span className={styles.summaryItem}>
          Total: <strong>{items.length}</strong>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.dotEnabled} />
          Habilitados: <strong>{enabledCount}</strong>
        </span>
        <span className={styles.summaryItem}>
          <span className={styles.dotDisabled} />
          Deshabilitados: <strong>{disabledCount}</strong>
        </span>
        <span className={styles.summaryItem}>
          Ocupados: <strong>{occupiedCount}</strong>
        </span>
        <span className={styles.summaryItem}>
          Libres (habilitados): <strong>{freeCount}</strong>
        </span>
      </div>

      {(localError || error) && (
        <p className={styles.error} role="alert" data-testid="office-error">
          {localError || error}
        </p>
      )}

      <form
        className={styles.capacityForm}
        onSubmit={handleApplyCapacity}
        data-testid="office-capacity-form"
      >
        <label htmlFor="office-target-input" className={styles.capacityLabel}>
          Ampliar capacidad hasta:
        </label>
        <input
          id="office-target-input"
          type="number"
          className={styles.capacityInput}
          placeholder={currentMax > 0 ? `Actual: ${currentMax}` : "Ej: 8"}
          value={targetInput}
          onChange={(e) => setTargetInput(e.target.value)}
          disabled={loading}
          aria-label="Capacidad objetivo de consultorios"
          data-testid="office-capacity-input"
        />
        <button
          type="submit"
          className={styles.btnApply}
          disabled={loading || !targetInput}
          data-testid="btn-apply-capacity"
        >
          {loading ? "Guardando..." : "Aplicar"}
        </button>
      </form>
      <p className={styles.hint}>
        Para reducir capacidad, deshabilita consultorios individualmente. No se
        eliminan ni renumeran registros históricos.
      </p>

      {items.length === 0 ? (
        <p className={styles.empty} data-testid="offices-empty">
          No hay consultorios en el catálogo.
        </p>
      ) : (
        <ul className={styles.list} data-testid="offices-list">
          {sorted.map((office) => (
            <li
              key={office.number}
              className={styles.item}
              data-testid={`office-item-${office.number}`}
            >
              <div className={styles.viewRow}>
                <div className={styles.officeInfo}>
                  <span className={styles.officeNumber}>
                    Consultorio {office.number}
                  </span>
                  <span
                    className={
                      office.enabled
                        ? styles.badgeEnabled
                        : styles.badgeDisabled
                    }
                    data-testid={`office-enabled-badge-${office.number}`}
                  >
                    {office.enabled ? "Habilitado" : "Deshabilitado"}
                  </span>
                  {office.enabled && (
                    <span
                      className={
                        office.occupied
                          ? styles.badgeOccupied
                          : styles.badgeFree
                      }
                    >
                      {office.occupied
                        ? `Ocupado${office.occupied_by_doctor_name ? ` · ${office.occupied_by_doctor_name}` : ""}`
                        : "Libre"}
                    </span>
                  )}
                </div>
                <button
                  className={
                    office.enabled ? styles.btnDisable : styles.btnEnable
                  }
                  onClick={() => handleToggle(office)}
                  disabled={loading || (office.enabled && office.occupied)}
                  title={
                    office.enabled && office.occupied
                      ? "No se puede deshabilitar: el consultorio está ocupado"
                      : undefined
                  }
                  aria-label={
                    office.enabled
                      ? `Deshabilitar consultorio ${office.number}`
                      : `Habilitar consultorio ${office.number}`
                  }
                  data-testid={`btn-toggle-office-${office.number}`}
                >
                  {office.enabled ? "Deshabilitar" : "Habilitar"}
                </button>
              </div>
              {office.enabled && office.occupied && (
                <p className={styles.occupiedNote}>
                  Está siendo usado. Podrás deshabilitarlo cuando el doctor haga
                  check-out.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
