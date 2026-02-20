import { Injectable } from "@nestjs/common";

import { ClockPort } from "../../domain/ports/outbound/clock.port";

/**
 * ⚕️ HUMAN CHECK - Adaptador de Infraestructura: Mapea ClockPort al tiempo del sistema.
 */
@Injectable()
export class SystemClockAdapter implements ClockPort {
  now(): number {
    return Date.now();
  }

  isoNow(): string {
    return new Date().toISOString();
  }
}
