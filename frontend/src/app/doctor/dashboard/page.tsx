"use client";

// SPEC-008: DoctorDashboardPage -- operational landing for doctor role
// SPEC-012: added "Finalizar atención" button for current patient
// SPEC-015: useAvailableOffices integrated for dynamic office selection at check-in
import DoctorStatusCard from "@/components/DoctorStatusCard/DoctorStatusCard";
import RoleGate from "@/components/RoleGate/RoleGate";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useAvailableOffices } from "@/hooks/useAvailableOffices";
import { useDoctorDashboard } from "@/hooks/useDoctorDashboard";

import styles from "./page.module.css";

function DoctorDashboardContent() {
  const { profile } = useAuth();
  const {
    doctor,
    loading,
    error,
    successMessage,
    checkIn,
    checkOut,
    completeCurrentAppointment,
  } = useDoctorDashboard();

  const {
    offices: availableOffices,
    loading: officesLoading,
    refetch: refetchOffices,
  } = useAvailableOffices();

  // SPEC-012: find the called appointment assigned to this doctor
  const { appointments } = useAppointmentsWebSocket();
  const doctorId = profile?.doctor_id ?? null;
  const currentAppointment = doctorId
    ? (appointments.find(
        (a) => a.status === "called" && a.doctorId === doctorId,
      ) ?? null)
    : null;

  const handleCheckIn = async (office: string) => {
    await checkIn(office);
    refetchOffices();
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div className={styles.headerIcon}>🩺</div>
        <div>
          <h1 className={styles.heading}>Panel del Doctor</h1>
          <p className={styles.subheading}>
            Bienvenido, {profile?.display_name ?? profile?.email}
          </p>
        </div>
      </header>

      {error && (
        <p className={styles.error} data-testid="dashboard-error">
          {error}
        </p>
      )}

      {successMessage && (
        <p className={styles.success} data-testid="dashboard-success">
          {successMessage}
        </p>
      )}

      {loading && !doctor && (
        <p className={styles.loading} data-testid="dashboard-loading">
          Cargando...
        </p>
      )}

      <div className={styles.grid}>
        {doctor && (
          <DoctorStatusCard
            doctor={doctor}
            onCheckIn={handleCheckIn}
            onCheckOut={checkOut}
            loading={loading}
            availableOffices={availableOffices}
            officesLoading={officesLoading}
          />
        )}

        {/* SPEC-012: current patient section with "Finalizar atención" button */}
        <section
          className={styles.patientCard}
          data-testid="current-patient-section"
        >
          <p className={styles.patientCardTitle}>Paciente en atención</p>
          {currentAppointment ? (
            <div data-testid="current-patient-info">
              <p className={styles.patientName}>
                <span className={styles.patientIndicator} />
                {currentAppointment.fullName}
              </p>
              <button
                className={styles.btnComplete}
                onClick={() =>
                  completeCurrentAppointment(currentAppointment.id)
                }
                disabled={loading}
                data-testid="btn-complete-appointment"
                aria-label="Finalizar atención del paciente actual"
              >
                {loading ? "Procesando..." : "Finalizar atención"}
              </button>
            </div>
          ) : (
            <div className={styles.noPatient} data-testid="no-current-patient">
              <span className={styles.noPatientIcon}>🪑</span>
              Sin paciente asignado
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DoctorDashboardPage() {
  return (
    <RoleGate roles={["doctor"]}>
      <DoctorDashboardContent />
    </RoleGate>
  );
}
