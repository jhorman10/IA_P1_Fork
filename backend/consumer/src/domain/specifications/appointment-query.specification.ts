import { AppointmentStatus } from '../entities/appointment.entity';

/**
 * Pattern: Specification (Conceptual)
 * Encapsulates business rules for querying appointments.
 * Prevents infrastructure adapters from defining what is "active" or "important".
 */
export class AppointmentQuerySpecification {
    /**
     * Business definition of "Active Appointments".
     */
    public static readonly ACTIVE_STATUSES: AppointmentStatus[] = ['waiting', 'called'];

    /**
     * Default sorting for the medical queue.
     * Logic: High priority first, then older appointments (FIFO within priority).
     */
    public static readonly QUEUE_SORT_ORDER = {
        priority: 1, // Note: Assumption that 'high' < 'medium' < 'low' strings or mapped values
        timestamp: 1
    };

    /**
     * Mongoose-specific filter for "Active" (Decoupled naming, coupled structure for adapter usage).
     */
    public static getActiveFilter() {
        return {
            status: { $in: this.ACTIVE_STATUSES }
        };
    }

    /**
     * Mongoose-specific filter for "Expired Called" appointments.
     */
    public static getExpiredCalledFilter(now: number) {
        return {
            status: 'called' as AppointmentStatus,
            completedAt: { $lte: now }
        };
    }
}
