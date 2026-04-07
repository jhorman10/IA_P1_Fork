"use client";

// SPEC-004: LoginForm — email/password form for Firebase authentication
import { useState } from "react";

import { sanitizeText } from "@/security/sanitize";

import styles from "./LoginForm.module.css";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export default function LoginForm({
  onSubmit,
  loading,
  error,
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const safeEmail = sanitizeText(email).trim();
    if (!safeEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail)) {
      setValidationError("Ingresa un correo electrónico válido.");
      return;
    }

    if (!password || password.length < 6) {
      setValidationError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    await onSubmit(safeEmail, password);
  };

  const displayError = validationError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className={styles.form}
      data-testid="login-form"
    >
      <h1 className={styles.title}>Acceso Operativo</h1>
      <p className={styles.subtitle}>Sistema de Turnos Médicos</p>

      <input
        type="email"
        id="email"
        placeholder="Correo institucional"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={styles.input}
        disabled={loading}
        autoComplete="email"
        data-testid="email-input"
      />

      <input
        type="password"
        id="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={styles.input}
        disabled={loading}
        autoComplete="current-password"
        data-testid="password-input"
      />

      <button
        type="submit"
        disabled={loading}
        className={styles.button}
        data-testid="submit-button"
      >
        {loading ? "Verificando..." : "Ingresar"}
      </button>

      {displayError && (
        <p className={styles.error} role="alert" data-testid="error-message">
          {displayError}
        </p>
      )}
    </form>
  );
}
