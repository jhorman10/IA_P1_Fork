/**
 * ⚕️ HUMAN CHECK - Clock Port: Abstract time provider to allow deterministic logic.
 * Essential for testing time-dependent rules without resorting to global state hacks.
 */
export interface ClockPort {
    now(): number;
    isoNow(): string;
}
