import { ConsultationPolicy } from '../../../../src/domain/policies/consultation.policy';

/**
 * ⚕️ HUMAN CHECK - Testability Verification:
 * Injectable RNG enables deterministic tests.
 * No Math.random() dependency in test execution.
 */
describe('ConsultationPolicy', () => {
    describe('Instance-based (injectable RNG)', () => {
        it('should return MIN_DURATION when random returns 0', () => {
            const policy = new ConsultationPolicy(() => 0);
            expect(policy.getRandomDurationSeconds()).toBe(8);
        });

        it('should return MAX_DURATION when random returns 0.99', () => {
            const policy = new ConsultationPolicy(() => 0.99);
            expect(policy.getRandomDurationSeconds()).toBe(15);
        });

        it('should return midpoint when random returns 0.5', () => {
            const policy = new ConsultationPolicy(() => 0.5);
            const result = policy.getRandomDurationSeconds();
            expect(result).toBeGreaterThanOrEqual(8);
            expect(result).toBeLessThanOrEqual(15);
            expect(result).toBe(12); // floor(0.5 * 8) + 8 = 12
        });

        it('should always produce values within [8, 15] range for valid random [0, 1)', () => {
            // Math.random() returns [0, 1) — 1.0 is never produced
            for (let i = 0; i < 100; i++) {
                const randomValue = i / 100;
                const policy = new ConsultationPolicy(() => randomValue);
                const duration = policy.getRandomDurationSeconds();
                expect(duration).toBeGreaterThanOrEqual(8);
                expect(duration).toBeLessThanOrEqual(15);
            }
        });
    });

    describe('Static convenience method (backward compatibility)', () => {
        it('should return a value within [8, 15] range', () => {
            const result = ConsultationPolicy.getRandomDurationSeconds();
            expect(result).toBeGreaterThanOrEqual(8);
            expect(result).toBeLessThanOrEqual(15);
        });

        it('should return an integer', () => {
            const result = ConsultationPolicy.getRandomDurationSeconds();
            expect(Number.isInteger(result)).toBe(true);
        });
    });
});
