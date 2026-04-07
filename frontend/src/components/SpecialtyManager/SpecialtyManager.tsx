"use client";

// SPEC-015: SpecialtyManager — CRUD inline de especialidades para el admin
import { useRef, useState } from "react";

import { Specialty } from "@/domain/Specialty";
import { UseSpecialtiesReturn } from "@/hooks/useSpecialties";
import { sanitizeText } from "@/security/sanitize";

import styles from "./SpecialtyManager.module.css";

interface SpecialtyManagerProps {
  items: Specialty[];
  loading: boolean;
  error: string | null;
  onCreate: UseSpecialtiesReturn["create"];
  onUpdate: UseSpecialtiesReturn["update"];
  onRemove: UseSpecialtiesReturn["remove"];
}

export default function SpecialtyManager({
  items,
  loading,
  error,
  onCreate,
  onUpdate,
  onRemove,
}: SpecialtyManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const name = sanitizeText(newName).trim();
    if (!name) {
      setLocalError("El nombre de la especialidad es obligatorio.");
      return;
    }
    const ok = await onCreate(name);
    if (ok) {
      setNewName("");
      newInputRef.current?.focus();
    }
  };

  const startEdit = (s: Specialty) => {
    setEditingId(s.id);
    setEditingName(s.name);
    setLocalError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = async (id: string) => {
    setLocalError(null);
    const name = sanitizeText(editingName).trim();
    if (!name) {
      setLocalError("El nombre no puede estar vacío.");
      return;
    }
    const ok = await onUpdate(id, name);
    if (ok) cancelEdit();
  };

  const handleRemove = async (id: string) => {
    setLocalError(null);
    await onRemove(id);
  };

  return (
    <section className={styles.section} data-testid="specialty-manager">
      <h3 className={styles.title}>Catálogo de Especialidades</h3>

      {(localError || error) && (
        <p className={styles.error} role="alert">
          {localError || error}
        </p>
      )}

      <form
        className={styles.addForm}
        onSubmit={handleCreate}
        data-testid="specialty-add-form"
      >
        <input
          ref={newInputRef}
          type="text"
          className={styles.input}
          placeholder="Nueva especialidad..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          disabled={loading}
          maxLength={100}
          aria-label="Nombre de la nueva especialidad"
          data-testid="specialty-name-input"
        />
        <button
          type="submit"
          className={styles.btnAdd}
          disabled={loading || !newName.trim()}
          data-testid="btn-add-specialty"
        >
          {loading ? "Guardando..." : "+ Agregar"}
        </button>
      </form>

      {items.length === 0 ? (
        <p className={styles.empty} data-testid="specialties-empty">
          No hay especialidades registradas.
        </p>
      ) : (
        <ul className={styles.list} data-testid="specialties-list">
          {items.map((s) => (
            <li
              key={s.id}
              className={styles.item}
              data-testid={`specialty-item-${s.id}`}
            >
              {editingId === s.id ? (
                <div className={styles.editRow}>
                  <input
                    type="text"
                    className={styles.input}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    disabled={loading}
                    maxLength={100}
                    aria-label={`Editar especialidad ${s.name}`}
                    data-testid="specialty-edit-input"
                  />
                  <button
                    className={styles.btnSave}
                    onClick={() => handleUpdate(s.id)}
                    disabled={loading || !editingName.trim()}
                    data-testid="btn-save-specialty"
                  >
                    Guardar
                  </button>
                  <button
                    className={styles.btnCancel}
                    onClick={cancelEdit}
                    disabled={loading}
                    data-testid="btn-cancel-specialty"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <div className={styles.viewRow}>
                  <span className={styles.name}>{s.name}</span>
                  <div className={styles.rowActions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => startEdit(s)}
                      disabled={loading}
                      data-testid={`btn-edit-specialty-${s.id}`}
                    >
                      Editar
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleRemove(s.id)}
                      disabled={loading}
                      data-testid={`btn-delete-specialty-${s.id}`}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
