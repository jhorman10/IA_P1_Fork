import { ClockPort } from '../../../src/domain/ports/outbound/clock.port';

/**
 * MockClockPort: Allows deterministic time control for testing.
 */
export class MockClockPort implements ClockPort {
    private currentTime: number = Date.now();

    constructor(initialTime?: number) {
        if (initialTime) {
            this.currentTime = initialTime;
        }
    }

    now(): number {
        return this.currentTime;
    }

    isoNow(): string {
        return new Date(this.currentTime).toISOString();
    }

    setCurrentTime(time: number) {
        this.currentTime = time;
    }

    advance(ms: number) {
        this.currentTime += ms;
    }

    reset() {
        this.currentTime = Date.now();
    }
}
