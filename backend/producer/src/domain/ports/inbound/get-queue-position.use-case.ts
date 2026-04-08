import { QueuePositionResponseDto } from "../../../dto/queue-position-response.dto";

/**
 * Inbound Port: Get Queue Position Use Case
 * SPEC-003: Calcula la posición ordinal de un paciente en la cola de espera.
 */
export interface GetQueuePositionUseCase {
  execute(idCard: number): Promise<QueuePositionResponseDto>;
}
