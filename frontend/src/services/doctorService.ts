// SPEC-008: Doctor HTTP service — checkIn/checkOut, list, getById, available offices
import { env } from "@/config/env";
import { Doctor } from "@/domain/Doctor";

async function throwWithMessage(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  const message =
    (body as { message?: string }).message ?? `HTTP_ERROR: ${res.status}`;
  throw new Error(message);
}

export async function getDoctors(
  status?: string,
  token?: string,
): Promise<Doctor[]> {
  const url = new URL(`${env.API_BASE_URL}/doctors`);
  if (status) url.searchParams.set("status", status);
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}

export async function getDoctorById(
  doctorId: string,
  token: string,
): Promise<Doctor> {
  const res = await fetch(`${env.API_BASE_URL}/doctors/${doctorId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}

export async function checkInDoctor(
  doctorId: string,
  token: string,
  office: string,
): Promise<Doctor> {
  const res = await fetch(`${env.API_BASE_URL}/doctors/${doctorId}/check-in`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ office }),
  });
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}

export async function checkOutDoctor(
  doctorId: string,
  token: string,
): Promise<Doctor> {
  const res = await fetch(`${env.API_BASE_URL}/doctors/${doctorId}/check-out`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}

export async function getAvailableOffices(token: string): Promise<string[]> {
  const res = await fetch(`${env.API_BASE_URL}/doctors/available-offices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return throwWithMessage(res);
  return res.json();
}
