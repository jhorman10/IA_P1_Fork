// SPEC-011: auditService — GET /audit-logs (fetch-based, consistent with profileService.ts)
import { env } from "@/config/env";
import { AuditLogFilters, AuditLogPage } from "@/domain/AuditLog";

export async function getAuditLogs(
  idToken: string,
  filters?: AuditLogFilters & { page?: number; limit?: number },
): Promise<AuditLogPage> {
  const url = new URL(`${env.API_BASE_URL}/audit-logs`);
  if (filters?.action) url.searchParams.set("action", filters.action);
  if (filters?.actorUid) url.searchParams.set("actorUid", filters.actorUid);
  if (filters?.from) url.searchParams.set("from", String(filters.from));
  if (filters?.to) url.searchParams.set("to", String(filters.to));
  if (filters?.page) url.searchParams.set("page", String(filters.page));
  if (filters?.limit) url.searchParams.set("limit", String(filters.limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error(`HTTP_ERROR: ${res.status}`);
  return res.json();
}
