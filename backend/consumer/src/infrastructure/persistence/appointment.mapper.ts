import { Appointment, AppointmentStatus } from '../../domain/entities/appointment.entity';
import { IdCard } from '../../domain/value-objects/id-card.value-object';
import { FullName } from '../../domain/value-objects/full-name.value-object';
import { Priority } from '../../domain/value-objects/priority.value-object';
import { AppointmentDocument } from '../../schemas/appointment.schema';
import { PersistenceAppointmentData } from './persistence-appointment.interface';

/**
 * Pattern: Data Mapper
 * Decouples the Mongoose document structure from the Domain Entity.
 * ⚕️ HUMAN CHECK - Zero 'any' types. Full type safety.
 */
export class AppointmentMapper {
    /**
     * Maps a Mongoose document to a Domain Entity.
     */
    public static toDomain(doc: AppointmentDocument): Appointment {
        return new Appointment(
            new IdCard(doc.idCard),
            new FullName(doc.fullName),
            new Priority(doc.priority),
            doc.status as AppointmentStatus,
            doc.office,
            doc.timestamp,
            doc.completedAt ?? undefined,
            String(doc._id), // 🎯 RECONSTRUCT IDENTITY
        );
    }

    /**
     * Maps a Domain Entity to a persistence object (for updates/saves).
     */
    public static toPersistence(entity: Appointment): PersistenceAppointmentData {
        return {
            idCard: entity.idCard.toValue(),
            fullName: entity.fullName.toValue(),
            priority: entity.priority.toValue(),
            status: entity.status,
            office: entity.office,
            completedAt: entity.completedAt,
            timestamp: entity.timestamp,
        };
    }
}
