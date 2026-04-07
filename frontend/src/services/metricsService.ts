// SPEC-013: metricsService — GET /metrics (fetch-based, consistent with auditService.ts)
import { env } from "@/config/env";
import { OperationalMetrics } from "@/domain/OperationalMetrics";

export async function getOperationalMetrics(
  idToken: string,
): Promise<OperationalMetrics> {
  const res = await fetch(`${env.API_BASE_URL}/metrics`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
  return res.json();
}
