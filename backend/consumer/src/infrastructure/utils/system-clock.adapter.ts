import { Injectable } from '@nestjs/common';
import { ClockPort } from '../../domain/ports/outbound/clock.port';

/**
 * ⚕️ HUMAN CHECK - Infrastructure Adapter: Maps ClockPort to standard system time.
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
