"use client";

import React from "react";

import WebSocketStatus from "@/components/WebSocketStatus";
import { useAppointmentsWebSocket } from "@/hooks/useAppointmentsWebSocket";

export default function WaitingRoomPage() {
  const { appointments, connectionStatus } = useAppointmentsWebSocket();

  return (
    <main data-testid="waiting-room-page">
      <h1>Sala de espera</h1>

      <WebSocketStatus status={connectionStatus} variant="inline" />

      <section>
        <h2>Cola</h2>
        {appointments.length === 0 ? (
          <p data-testid="empty-queue">No hay turnos en este momento.</p>
        ) : (
          <ul data-testid="queue-list">
            {appointments.map((a) => (
              <li key={a.id} data-testid={`queue-item-${a.id}`}>
                {a.fullName} — {a.status}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
