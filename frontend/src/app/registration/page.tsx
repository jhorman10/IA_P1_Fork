"use client";

import AppointmentRegistrationForm from "@/components/AppointmentRegistrationForm/AppointmentRegistrationForm";
import { useRoleGuard } from "@/hooks/useRoleGuard";

export default function RegistrationPage() {
  const { allowed } = useRoleGuard(["admin", "recepcionista", "doctor"]);

  if (!allowed) return null;

  return <AppointmentRegistrationForm />;
}
