"use client";

// SPEC-004: LoginPage — public entry point for internal staff authentication
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import LoginForm from "@/components/LoginForm/LoginForm";
import { useAuth } from "@/hooks/useAuth";

import styles from "./page.module.css";

export default function LoginPage() {
  const { profile, loading, authError, login } = useAuth();
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect based on role once profile is resolved.
  // SPEC-008: doctor redirects to /doctor/dashboard (operational landing).
  useEffect(() => {
    if (!loading && profile) {
      if (profile.role === "admin") {
        router.replace("/admin/profiles");
      } else if (profile.role === "recepcionista") {
        router.replace("/registration");
      } else if (profile.role === "doctor") {
        router.replace("/doctor/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [loading, profile, router]);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError(null);
      setSubmitting(true);
      await login(email, password);
      // After this, AuthProvider's onAuthStateChanged takes over and sets profile
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      // Map Firebase error codes to user-friendly messages
      if (
        message.includes("auth/invalid-credential") ||
        message.includes("auth/wrong-password") ||
        message.includes("auth/user-not-found")
      ) {
        setLoginError(
          "Credenciales incorrectas. Verifica tu correo y contraseña.",
        );
      } else if (message.includes("auth/too-many-requests")) {
        setLoginError("Demasiados intentos fallidos. Intenta más tarde.");
      } else {
        setLoginError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || loading;
  const displayError = loginError || authError;

  return (
    <main className={styles.main}>
      <LoginForm
        onSubmit={handleLogin}
        loading={isLoading}
        error={displayError}
      />
    </main>
  );
}
