// SPEC-016: officeService — catálogo administrable de consultorios
import { env } from "@/config/env";
import { ApplyCapacityResult, Office } from "@/domain/Office";

interface OfficeApiResponse {
  number: string;
  enabled: boolean;
  occupied: boolean;
  occupiedByDoctorId: string | null;
  occupiedByDoctorName: string | null;
  occupiedByStatus: string | null;
  canDisable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

function mapOfficeResponse(office: OfficeApiResponse): Office {
  return {
    number: office.number,
    enabled: office.enabled,
    occupied: office.occupied,
    occupied_by_doctor_id: office.occupiedByDoctorId,
    occupied_by_doctor_name: office.occupiedByDoctorName,
    occupied_by_status: office.occupiedByStatus,
    can_disable: office.canDisable,
    created_at: office.createdAt,
    updated_at: office.updatedAt,
  };
}

export async function getOffices(token: string): Promise<Office[]> {
  const res = await fetch(`${env.API_BASE_URL}/offices`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`HTTP_ERROR: ${res.status}`);
  }
  const data = (await res.json()) as OfficeApiResponse[];
  return data.map(mapOfficeResponse);
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
  const office = (await res.json()) as OfficeApiResponse;
  return mapOfficeResponse(office);
}
