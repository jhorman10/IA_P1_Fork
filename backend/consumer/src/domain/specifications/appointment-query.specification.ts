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
    public static readonly ACTIVE_STATUSES: AppointmentStatus[] = ['waiting'];

    /**
     * Default sorting for the medical queue.
     * Logic: High priority first, then older appointments (FIFO within priority).
     */
    public static readonly QUEUE_SORT_ORDER: Record<string, 1 | -1> = {
        priority: 1 as const, // Note: Assumption that 'high' < 'medium' < 'low' strings or mapped values
        timestamp: 1 as const
    };
}
