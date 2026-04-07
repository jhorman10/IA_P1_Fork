"use client";

import React, { useState } from "react";

import { useAppointmentRegistration } from "@/hooks/useAppointmentRegistration";
import { sanitizeText } from "@/security/sanitize";

export default function AppointmentForm() {
  const [fullName, setFullName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [validationError, setValidationError] = useState<string | null>(null);

  const { register, loading, success, error } = useAppointmentRegistration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const safeName = sanitizeText(fullName);
    const safeId = sanitizeText(idCard);

    if (!safeName) {
      setValidationError("Ingresa un nombre válido.");
      return;
    }

    if (!safeId) {
      setValidationError("Ingresa un número de documento válido.");
      return;
    }

    await register({ fullName: safeName, idCard: safeId, priority });
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} data-testid="appointment-form">
      <h2>Solicitar turno</h2>

      <input
        data-testid="fullName-input"
        placeholder="Nombre completo"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={loading}
      />

      <input
        data-testid="idCard-input"
        placeholder="Documento (cédula)"
        value={idCard}
        onChange={(e) => setIdCard(e.target.value)}
        disabled={loading}
      />

      <select
        data-testid="priority-select"
        value={priority}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
          setPriority(e.target.value as "high" | "medium" | "low")
        }
        disabled={loading}
      >
        <option value="medium">Normal</option>
        <option value="high">Prioritario</option>
        <option value="low">Baja</option>
      </select>

      <button type="submit" disabled={loading} data-testid="submit-button">
        {loading ? "Enviando..." : "Pedir turno"}
      </button>

      {displayError && (
        <p role="alert" data-testid="error-message">
          {displayError}
        </p>
      )}

      {success && <p data-testid="success-message">{success}</p>}
    </form>
  );
}
