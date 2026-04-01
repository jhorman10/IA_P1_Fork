// SPEC-003: servicio HTTP para médicos
// \u2695\ufe0f HUMAN CHECK - Endpoint: GET /doctors?status=
import { env } from "@/config/env";
import { Doctor, DoctorStatus } from "@/domain/Doctor";

export async function getDoctors(status?: DoctorStatus): Promise<Doctor[]> {
  const url = new URL(`${env.API_BASE_URL}/doctors`);
  if (status) {
    url.searchParams.set("status", status);
  }
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP_ERROR: ${res.status}`);
  }
  return res.json();
}
