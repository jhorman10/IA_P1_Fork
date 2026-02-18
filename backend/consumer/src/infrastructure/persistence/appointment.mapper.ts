import { Appointment, AppointmentPriority, AppointmentStatus } from '../../domain/entities/appointment.entity';
import { IdCard } from '../../domain/value-objects/id-card.value-object';
import { AppointmentDocument } from '../../schemas/appointment.schema';

/**
 * Pattern: Data Mapper
 * Decouples the Mongoose document structure from the Domain Entity.
 */
export class AppointmentMapper {
    /**
     * Maps a Mongoose document to a Domain Entity.
     */
    public static toDomain(doc: AppointmentDocument): Appointment {
        return new Appointment(
            String(doc._id),
            new IdCard(doc.idCard),
            doc.fullName,
            doc.priority as AppointmentPriority,
            doc.status as AppointmentStatus,
            doc.office,
            doc.timestamp,
            doc.completedAt,
        );
    }

    /**
     * Maps a Domain Entity to a persistence object (for updates/saves).
     */
    public static toPersistence(entity: Appointment): any {
        return {
            idCard: entity.idCard.toValue(),
            fullName: entity.fullName,
            priority: entity.priority,
            status: entity.status,
            office: entity.office,
            completedAt: entity.completedAt,
            timestamp: entity.timestamp,
        };
    }
}
