"use client";

// SPEC-004: Admin Profiles Page — CRUD for operational profiles (admin only)
// SPEC-015: SpecialtyManager section added for managing the specialties catalog
// SPEC-016: OfficeManager section added for managing the offices catalog
// SPEC-017: Exclusive mode navigation — single active view at a time
import { useState } from "react";

import OfficeManager from "@/components/OfficeManager/OfficeManager";
import ProfileFormModal from "@/components/ProfileFormModal/ProfileFormModal";
import SpecialtyManager from "@/components/SpecialtyManager/SpecialtyManager";
import { CreateProfileDTO, Profile, UpdateProfileDTO } from "@/domain/Profile";
import { useAuth } from "@/hooks/useAuth";
import { useOfficeCatalog } from "@/hooks/useOfficeCatalog";
import { useProfiles } from "@/hooks/useProfiles";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { useSpecialties } from "@/hooks/useSpecialties";

import styles from "./page.module.css";

type AdminProfilesViewMode = "profiles" | "specialties" | "offices";

export default function AdminProfilesPage() {
  const { profile: currentUser } = useAuth();
  const { allowed } = useRoleGuard(["admin"]);
  const { items, loading, error, create, update, refetch } = useProfiles();

  const [activeView, setActiveView] =
    useState<AdminProfilesViewMode>("profiles");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const {
    items: specialties,
    loading: specialtiesLoading,
    error: specialtiesError,
    create: createSpecialty,
    update: updateSpecialty,
    remove: removeSpecialty,
  } = useSpecialties({ enabled: activeView === "specialties" });

  const {
    items: offices,
    loading: officesLoading,
    error: officesError,
    applyCapacity: applyOfficeCapacity,
    toggleEnabled: toggleOfficeEnabled,
  } = useOfficeCatalog({ enabled: activeView === "offices" });

  if (!allowed) return null;

  const switchMode = (mode: AdminProfilesViewMode) => {
    if (mode !== "profiles") {
      setModalOpen(false);
      setSelectedProfile(null);
      setModalError(null);
    }
    setActiveView(mode);
  };

  const openCreate = () => {
    setSelectedProfile(null);
    setModalError(null);
    setModalOpen(true);
  };

  const openEdit = (p: Profile) => {
    setSelectedProfile(p);
    setModalError(null);
    setModalOpen(true);
  };

  const handleModalSubmit = async (
    data: CreateProfileDTO | UpdateProfileDTO,
  ): Promise<boolean> => {
    setModalError(null);
    if (selectedProfile) {
      const ok = await update(selectedProfile.uid, data as UpdateProfileDTO);
      if (!ok) setModalError(error ?? "Error al actualizar perfil");
      return ok;
    }
    const ok = await create(data as CreateProfileDTO);
    if (!ok) setModalError(error ?? "Error al crear perfil");
    return ok;
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.heading}>Gestión Operativa</h1>
          <p className={styles.subheading}>
            Bienvenido, {currentUser?.display_name ?? currentUser?.email}
          </p>
        </div>
      </header>

      <nav className={styles.modeSelector} aria-label="Selector de gestión">
        <button
          className={
            activeView === "profiles" ? styles.modeBtnActive : styles.modeBtn
          }
          onClick={() => switchMode("profiles")}
          data-testid="btn-mode-profiles"
          aria-current={activeView === "profiles" ? "page" : undefined}
        >
          Gestión de perfiles
        </button>
        <button
          className={
            activeView === "specialties" ? styles.modeBtnActive : styles.modeBtn
          }
          onClick={() => switchMode("specialties")}
          data-testid="btn-mode-specialties"
          aria-current={activeView === "specialties" ? "page" : undefined}
        >
          Gestionar especialidades
        </button>
        <button
          className={
            activeView === "offices" ? styles.modeBtnActive : styles.modeBtn
          }
          onClick={() => switchMode("offices")}
          data-testid="btn-mode-offices"
          aria-current={activeView === "offices" ? "page" : undefined}
        >
          Gestionar consultorios
        </button>
      </nav>

      <div className={styles.modeContent}>
        {activeView === "profiles" && (
          <>
            <div className={styles.modeContentHeader}>
              <button
                className={styles.btnPrimary}
                onClick={openCreate}
                disabled={loading}
                data-testid="btn-create-profile"
              >
                Crear perfil
              </button>
            </div>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            {loading && items.length === 0 ? (
              <p className={styles.emptyState}>Cargando perfiles...</p>
            ) : items.length === 0 ? (
              <p className={styles.emptyState}>
                No hay perfiles registrados.{" "}
                <button className={styles.inlineLink} onClick={openCreate}>
                  Crear el primero
                </button>
              </p>
            ) : (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((p) => (
                      <tr key={p.uid}>
                        <td>{p.display_name}</td>
                        <td>{p.email}</td>
                        <td>
                          <span
                            className={
                              styles[`role_${p.role}`] ?? styles.roleBadge
                            }
                          >
                            {p.role}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              p.status === "active"
                                ? styles.statusActive
                                : styles.statusInactive
                            }
                          >
                            {p.status === "active" ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.editBtn}
                            onClick={() => openEdit(p)}
                            disabled={loading}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className={styles.refreshRow}>
              <button
                className={styles.btnSecondary}
                onClick={refetch}
                disabled={loading}
              >
                {loading ? "Actualizando..." : "Actualizar lista"}
              </button>
            </div>

            <ProfileFormModal
              isOpen={modalOpen}
              initialData={selectedProfile}
              onSubmit={handleModalSubmit}
              onClose={() => setModalOpen(false)}
              loading={loading}
              error={modalError}
            />
          </>
        )}

        {activeView === "specialties" && (
          <SpecialtyManager
            items={specialties}
            loading={specialtiesLoading}
            error={specialtiesError}
            onCreate={createSpecialty}
            onUpdate={updateSpecialty}
            onRemove={removeSpecialty}
          />
        )}

        {activeView === "offices" && (
          <OfficeManager
            items={offices}
            loading={officesLoading}
            error={officesError}
            onApplyCapacity={applyOfficeCapacity}
            onToggleEnabled={toggleOfficeEnabled}
          />
        )}
      </div>
    </main>
  );
}
