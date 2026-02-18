/**
 * ⚕️ HUMAN CHECK - Domain Policy: Encapsulates business rules for consultations
 * This is a pure domain component, independent of any infrastructure or framework.
 */
export class ConsultationPolicy {
    private static readonly MIN_DURATION_SECONDS = 8;
    private static readonly MAX_DURATION_SECONDS = 15;

    /**
     * Calculates a random duration for a medical consultation based on clinic policies.
     * Moving this here ensures the Use Case remains focused on orchestration.
     */
    public static getRandomDurationSeconds(): number {
        return Math.floor(
            Math.random() * (this.MAX_DURATION_SECONDS - this.MIN_DURATION_SECONDS + 1),
        ) + this.MIN_DURATION_SECONDS;
    }
}
