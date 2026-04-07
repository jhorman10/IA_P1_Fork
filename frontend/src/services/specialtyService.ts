// SPEC-015: specialtyService — CRUD for specialties catalog
import { env } from "@/config/env";
import { Specialty } from "@/domain/Specialty";

export async function getSpecialties(token: string): Promise<Specialty[]> {
  const res = await fetch(`${env.API_BASE_URL}/specialties`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`HTTP_ERROR: ${res.status}`);
  }
  return res.json();
}

export async function createSpecialty(
  data: { name: string },
  token: string,
): Promise<Specialty> {
  const res = await fetch(`${env.API_BASE_URL}/specialties`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      body?.message ?? `HTTP_ERROR: ${res.status}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function updateSpecialty(
  id: string,
  data: { name: string },
  token: string,
): Promise<Specialty> {
  const res = await fetch(`${env.API_BASE_URL}/specialties/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      body?.message ?? `HTTP_ERROR: ${res.status}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function deleteSpecialty(
  id: string,
  token: string,
): Promise<void> {
  const res = await fetch(`${env.API_BASE_URL}/specialties/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      body?.message ?? `HTTP_ERROR: ${res.status}`,
    ) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
}
