"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { Appointment } from "@/domain/Appointment";
import { audioService } from "@/services/AudioService";
import AppointmentCard from "@/components/AppointmentCard/AppointmentCard";
import styles from "@/styles/page.module.css";

/**
 * Main Appointments Screen — Real-time via WebSocket
 */
export default function AppointmentsScreen() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleUpdate = useCallback((appointment: Appointment) => {
    if (appointment.status === "called") {
      if (audioService.isEnabled()) {
        audioService.play();
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }
  }, []);

  const { appointments, error, connected } = useAppointmentsWebSocket(handleUpdate);

  useEffect(() => {
    audioService.init("/sounds/ding.mp3", 0.6);

    const unlock = async () => {
      await audioService.unlock();
      setAudioEnabled(audioService.isEnabled());
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);


  const calledAppointments = appointments.filter(t => t.status === "called");
  const waitingAppointments = appointments
    .filter(t => t.status === "waiting")
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  return (
    <main className={styles.dashboardSplitLayout}>
      <section className={styles.leftPanel}>
        <header className={styles.stickyHeader}>
          <h1 className={styles.title}>Turnos Disponibles</h1>
          <p className={connected ? styles.connected : styles.disconnected}>
            {connected ? "🟢 Conectado en tiempo real" : "🔴 Desconectado — reconectando..."}
          </p>
          {!audioEnabled && (
            <p className={styles.audioHint}>
              Toca la pantalla para activar sonido 🔔
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </header>

        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>📢 Llamados <span className={styles.countBadge}>{calledAppointments.length}</span></h2>
          {calledAppointments.length > 0 ? (
            <ul className={styles.cardGrid}>
              {calledAppointments.map((t) => (
                <AppointmentCard
                  key={t.id}
                  appointment={t}
                  status="called"
                  showTime={true}
                  timeIcon="🔔"
                />
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No hay turnos llamados</p>
          )}
        </section>

        {appointments.length === 0 && !error && (
          <p className={styles.empty}>No hay turnos registrados</p>
        )}

        {showToast && (
          <div className={styles.toast}>
            🔔 Nuevo turno llamado
          </div>
        )}
      </section>
      <aside className={styles.rightPanel}>
        <h2 className={styles.sectionTitle}>⏳ Cola de Espera <span className={styles.countBadge}>{waitingAppointments.length}</span></h2>
        {waitingAppointments.length > 0 ? (
          <ul className={styles.cardGrid}>
            {waitingAppointments.map((t) => (
              <AppointmentCard
                key={t.id}
                appointment={t}
                status="waiting"
                showTime={true}
                timeIcon="📝"
                consultorioLabel="Pendiente"
              />
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No hay turnos en espera</p>
        )}
      </aside>
    </main>
  );
}
