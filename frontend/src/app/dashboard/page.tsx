"use client";

import { useEffect, useRef, useState } from "react";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Dashboard for completed appointments history.
 */
export default function CompletedHistoryDashboard() {
  const { appointments, error, connected } = useAppointmentsWebSocket();

  const lastCountRef = useRef<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);

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

  useEffect(() => {
    if (lastCountRef.current === null) {
      const completedCount = appointments.filter(t => t.status === "completed").length;
      lastCountRef.current = completedCount;
      return;
    }

    const completedCount = appointments.filter(t => t.status === "completed").length;
    if (completedCount > lastCountRef.current) {
      if (audioService.isEnabled()) {
        audioService.play();
      }

      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }

    lastCountRef.current = completedCount;
  }, [appointments]);

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
      <h1 className={styles.title}>Completed Appointments History</h1>

      <p className={connected ? styles.connected : styles.disconnected}>
        {connected ? "🟢 Connected in real-time" : "🔴 Disconnected — reconnecting..."}
      </p>

      {!audioEnabled && (
        <p className={styles.audioHint}>
          Tap the screen to enable sound 🔔
        </p>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {completedAppointments.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>✅ Completed ({completedAppointments.length})</h2>
          <ul className={styles.list}>
            {completedAppointments.map((t) => (
              <li key={t.id} className={`${styles.item} ${styles.atendido}`}>
                <span className={styles.nombre}>{t.fullName}</span>
                <span className={styles.hora}>{formatTime(t.timestamp)}</span>
                <span>Office {t.office}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {completedAppointments.length === 0 && !error && (
        <p className={styles.empty}>No completed appointments yet</p>
      )}

      {showToast && (
        <div className={styles.toast}>
          ✅ Appointment completed
        </div>
      )}
    </main>
  );
}
