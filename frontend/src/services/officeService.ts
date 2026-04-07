// SPEC-016: officeService — catálogo administrable de consultorios
import { env } from "@/config/env";
import { ApplyCapacityResult, Office } from "@/domain/Office";

export async function getOffices(token: string): Promise<Office[]> {
  const res = await fetch(`${env.API_BASE_URL}/offices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`HTTP_ERROR: ${res.status}`);
  }
  return res.json();
}

export async function applyOfficeCapacity(
  data: { target_total: number },
  token: string,
): Promise<ApplyCapacityResult> {
  const res = await fetch(`${env.API_BASE_URL}/offices/capacity`, {
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

export async function updateOfficeEnabled(
  number: string,
  data: { enabled: boolean },
  token: string,
): Promise<Office> {
  const res = await fetch(
    `${env.API_BASE_URL}/offices/${encodeURIComponent(number)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    },
  );
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
