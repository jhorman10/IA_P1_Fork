// SPEC-012: Appointment action service — complete, cancel, queue position
import { env } from "@/config/env";

async function throwWithMessage(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string }).message ?? `HTTP_ERROR: ${res.status}`;
  throw new Error(message);
}

export async function completeAppointment(
  appointmentId: string,
  token: string,
): Promise<unknown> {
  const res = await fetch(
    `${env.API_BASE_URL}/appointments/${appointmentId}/complete`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}

export async function cancelAppointment(
  appointmentId: string,
  token: string,
): Promise<unknown> {
  const res = await fetch(
    `${env.API_BASE_URL}/appointments/${appointmentId}/cancel`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}

export async function getQueuePosition(
  idCard: number,
): Promise<{ position: number; total: number; appointmentId: string }> {
  const res = await fetch(
    `${env.API_BASE_URL}/appointments/queue-position/${idCard}`,
  );
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}
