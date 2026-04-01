// SPEC-003: servicio HTTP para posición en cola
// \u2695\ufe0f HUMAN CHECK - Endpoint: GET /appointments/queue-position/:idCard
import { env } from "@/config/env";
import { QueuePosition } from "@/domain/QueuePosition";

export async function getQueuePosition(idCard: number): Promise<QueuePosition> {
  const res = await fetch(
    `${env.API_BASE_URL}/appointments/queue-position/${idCard}`,
  );
  if (!res.ok) {
    throw new Error(`HTTP_ERROR: ${res.status}`);
  }
  return res.json();
}
