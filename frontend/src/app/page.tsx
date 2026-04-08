"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  CalledAppointmentCard,
  WaitingAppointmentCard,
} from "@/components/AppointmentCard";
import AppointmentSkeleton from "@/components/AppointmentSkeleton";
import { AssignmentNotification } from "@/components/AssignmentNotification/AssignmentNotification";
import WebSocketStatus from "@/components/WebSocketStatus";
import { Appointment } from "@/domain/Appointment";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";
import { audioService } from "@/services/AudioService";
import styles from "@/styles/page.module.css";

/**
 * Main Appointments Screen — Real-time via WebSocket
 */
export default function AppointmentsScreen() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [assignedAppointment, setAssignedAppointment] =
    useState<Appointment | null>(null);

  // Force light mode on public screen — restore user preference on unmount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
    return () => {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        document.documentElement.setAttribute("data-theme", stored);
      }
    };
  }, []);

  // SPEC-003: track previous statuses to detect waiting → called transition
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  const handleUpdate = useCallback((appointment: Appointment) => {
    const prevStatus = prevStatusRef.current.get(appointment.id);

    // SPEC-003: detect waiting → called transition and show assignment notification
    if (prevStatus === "waiting" && appointment.status === "called") {
      setAssignedAppointment(appointment);
    }

    prevStatusRef.current.set(appointment.id, appointment.status);

    if (appointment.status === "called") {
      if (audioService.isEnabled()) {
        audioService.play();
      }
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2600);
    }
  }, []);

  const {
    appointments,
    error,
    connected: _connected,
    isConnecting,
    connectionStatus,
  } = useAppointmentsWebSocket(handleUpdate);

  // SPEC-003: seed prevStatusRef from initial snapshot so already-called
  // appointments don't trigger spurious notifications on page load
  useEffect(() => {
    appointments.forEach((appt) => {
      if (!prevStatusRef.current.has(appt.id)) {
        prevStatusRef.current.set(appt.id, appt.status);
      }
    });
  }, [appointments]);

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

  const calledAppointments = appointments.filter((t) => t.status === "called");
  const waitingAppointments = appointments
    .filter((t) => t.status === "waiting")
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  return (
    <main className={styles.dashboardSplitLayout}>
      <section className={styles.leftPanel}>
        <header className={styles.stickyHeader}>
          <h1 className={styles.title}>Turnos Disponibles</h1>
          <WebSocketStatus status={connectionStatus} variant="block" />
          {!audioEnabled && (
            <p className={styles.audioHint}>
              Toca la pantalla para activar sonido 🔔
            </p>
          )}
          {error && <p className={styles.error}>{error}</p>}
        </header>

        <section className={styles.sectionBlock}>
          <h2 className={styles.sectionTitle}>
            🏥 En consultorio{" "}
            <span className={styles.countBadge}>
              {calledAppointments.length}
            </span>
          </h2>
          {calledAppointments.length > 0 ? (
            <ul className={styles.cardGrid}>
              {calledAppointments.map((t) => (
                <CalledAppointmentCard
                  key={t.id}
                  appointment={t}
                  showTime={true}
                  timeIcon="🔔"
                />
              ))}
            </ul>
          ) : isConnecting ? (
            <AppointmentSkeleton count={2} />
          ) : (
            <p className={styles.empty}>No hay turnos en consultorio</p>
          )}
        </section>

        {appointments.length === 0 && !error && (
          <p className={styles.empty}>No hay turnos registrados</p>
        )}

        {showToast && (
          <div className={styles.toast}>🔔 Nuevo turno llamado</div>
        )}
      </section>
      <aside className={styles.rightPanel}>
        <h2 className={styles.sectionTitle}>
          ⏳ En espera
          <span className={styles.countBadge}>
            {waitingAppointments.length}
          </span>
        </h2>
        {waitingAppointments.length > 0 ? (
          <ul className={styles.cardGrid}>
            {waitingAppointments.map((t, idx) => (
              <WaitingAppointmentCard
                key={t.id}
                appointment={t}
                timeIcon="📝"
                queuePosition={idx + 1}
                total={waitingAppointments.length}
              />
            ))}
          </ul>
        ) : isConnecting ? (
          <AppointmentSkeleton count={3} />
        ) : (
          <p className={styles.empty}>No hay turnos en espera</p>
        )}
      </aside>
      {assignedAppointment && (
        <AssignmentNotification
          appointment={assignedAppointment}
          onDismiss={() => setAssignedAppointment(null)}
        />
      )}
    </main>
  );
}
