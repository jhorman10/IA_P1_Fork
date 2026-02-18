/**
 * ⚕️ HUMAN CHECK - Domain Policy: Encapsulates business rules for consultations.
 * Made instance-based with injectable RNG for deterministic testing (F-10).
 */
export class ConsultationPolicy {
    private static readonly MIN_DURATION_SECONDS = 8;
    private static readonly MAX_DURATION_SECONDS = 15;

    constructor(private readonly randomFn: () => number = Math.random) { }

    /**
     * Calculates a random duration for a medical consultation based on clinic policies.
     * The RNG function is injectable for deterministic tests.
     */
    public getRandomDurationSeconds(): number {
        return Math.floor(
            this.randomFn() * (ConsultationPolicy.MAX_DURATION_SECONDS - ConsultationPolicy.MIN_DURATION_SECONDS + 1),
        ) + ConsultationPolicy.MIN_DURATION_SECONDS;
    }

    /**
     * Static convenience method for production use (default Math.random).
     */
    public static getRandomDurationSeconds(): number {
        return new ConsultationPolicy().getRandomDurationSeconds();
    }
}
