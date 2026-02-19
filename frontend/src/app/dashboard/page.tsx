"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { Appointment } from "@/domain/Appointment";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Dashboard for completed appointments history.
 */
export default function CompletedHistoryDashboard() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleUpdate = useCallback((appointment: Appointment) => {
    if (appointment.status === "completed") {
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


  const waitingAppointments = appointments
    .filter(t => t.status === "waiting")
    .sort((a, b) => {
      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const calledAppointments = appointments
    .filter(t => t.status === "called")
    .sort((a, b) => a.timestamp - b.timestamp);

  const completedAppointments = appointments
    .filter(t => t.status === "completed")
    .sort((a, b) => b.timestamp - a.timestamp);

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  };

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Panel de Turnos en Tiempo Real</h1>

      <p className={connected ? styles.connected : styles.disconnected}>
        {connected ? "🟢 Conectado en tiempo real" : "🔴 Desconectado — reconectando..."}
      </p>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Toca la pantalla para activar sonido 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {/* Lista de espera */}
      <h2 className={styles.sectionTitle}>⏳ En espera ({waitingAppointments.length})</h2>
      {waitingAppointments.length > 0 ? (
        <ul className={styles.list}>
          {waitingAppointments.map((t) => (
            <li key={t.id} className={`${styles.item} ${styles.waiting}`}>
              <span className={styles.nombre}>{t.fullName}</span>
              <span className={styles.hora}>{formatTime(t.timestamp)}</span>
              <span className={styles.badge}>
                {t.priority === "high" ? "🔴 Alta" : t.priority === "medium" ? "🟡 Media" : "🟢 Baja"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No hay turnos en espera</p>
      )}

      {/* Asignados a consultorio */}
      <h2 className={styles.sectionTitle}>🏥 En consultorio ({calledAppointments.length})</h2>
      {calledAppointments.length > 0 ? (
        <ul className={styles.list}>
          {calledAppointments.map((t) => (
            <li key={t.id} className={`${styles.item} ${styles.called}`}>
              <span className={styles.nombre}>{t.fullName}</span>
              <span className={styles.hora}>{formatTime(t.timestamp)}</span>
              <span>Consultorio {t.office}</span>
              <span className={styles.badge}>
                {t.priority === "high" ? "🔴 Alta" : t.priority === "medium" ? "🟡 Media" : "🟢 Baja"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No hay turnos siendo atendidos</p>
      )}

      {/* Historial completados */}
      <h2 className={styles.sectionTitle}>✅ Completados ({completedAppointments.length})</h2>
      {completedAppointments.length > 0 ? (
        <ul className={styles.list}>
          {completedAppointments.map((t) => (
            <li key={t.id} className={`${styles.item} ${styles.atendido}`}>
              <span className={styles.nombre}>{t.fullName}</span>
              <span className={styles.hora}>{formatTime(t.timestamp)}</span>
              <span>Consultorio {t.office}</span>
              <span className={styles.badge}>
                {t.priority === "high" ? "🔴 Alta" : t.priority === "medium" ? "🟡 Media" : "🟢 Baja"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>No hay turnos completados aún</p>
      )}

      {showToast && (
        <div className={styles.toast}>
          ✅ Turno completado
        </div>
      )}
    </main>
  );
}
