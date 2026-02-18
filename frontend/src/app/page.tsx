"use client";

import { useCallback, useEffect, useState } from "react";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { Appointment } from "@/domain/Appointment";
import { audioService } from "@/services/AudioService";
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
  const waitingAppointments = appointments.filter(t => t.status === "waiting");

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Available Appointments</h1>

      <p className={connected ? styles.connected : styles.disconnected}>
        {connected ? "🟢 Connected in real-time" : "🔴 Disconnected — reconnecting..."}
      </p>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Tap the screen to enable sound 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {calledAppointments.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>📢 Called</h2>
          <ul className={styles.list}>
            {calledAppointments.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.highlight}`}>
                <span className={styles.nombre}>{t.fullName}</span>
                <span>Office {t.office}</span>
                <span className={styles.badge}>
                  {t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢"} {t.priority}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {waitingAppointments.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>⏳ Waiting</h2>
          <ul className={styles.list}>
            {waitingAppointments.map((t) => (
              <li key={t.id} className={styles.item}>
                <span className={styles.nombre}>{t.fullName}</span>
                <span>Office not assigned</span>
                <span className={styles.badge}>
                  {t.priority === "high" ? "🔴" : t.priority === "medium" ? "🟡" : "🟢"} {t.priority}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {appointments.length === 0 && !error && (
        <p className={styles.empty}>No appointments registered</p>
      )}

      {showToast && (
        <div className={styles.toast}>
          🔔 New appointment called
        </div>
      )}
    </main>
  );
}
