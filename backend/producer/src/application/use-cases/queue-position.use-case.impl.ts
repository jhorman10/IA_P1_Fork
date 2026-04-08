import { Inject, Injectable } from "@nestjs/common";

import { GetQueuePositionUseCase } from "../../domain/ports/inbound/get-queue-position.use-case";
import { AppointmentReadRepository } from "../../domain/ports/outbound/appointment-read.repository";
import { QueuePositionResponseDto } from "../../dto/queue-position-response.dto";
import { AppointmentPriority } from "../../types/appointment-event";

const PRIORITY_ORDER: Record<AppointmentPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * Application Use Case: Get Queue Position
 * SPEC-003: Calcula la posición ordinal (1-based) de un paciente entre los turnos en espera.
 * Ordenamiento: Alta (high) > Media (medium) > Baja (low), empate por timestamp ASC (FIFO).
 */
@Injectable()
export class GetQueuePositionUseCaseImpl implements GetQueuePositionUseCase {
  constructor(
    @Inject("AppointmentReadRepository")
    private readonly repository: AppointmentReadRepository,
  ) {}

  async execute(idCard: number): Promise<QueuePositionResponseDto> {
    const waiting = await this.repository.findWaiting();

    // Sort by priority (high first) then by timestamp (FIFO)
    const sorted = [...waiting].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority];
      const pb = PRIORITY_ORDER[b.priority];
      if (pa !== pb) return pa - pb;
      return a.timestamp - b.timestamp;
    });

    const total = sorted.length;
    const idx = sorted.findIndex((a) => a.idCard === idCard);

    if (idx === -1) {
      return {
        idCard,
        position: 0,
        total,
        status: "not_found",
        priority: null,
      };
    }

    const appointment = sorted[idx];
    return {
      idCard,
      position: idx + 1,
      total,
      status: appointment.status,
      priority: appointment.priority,
    };
  }
}
