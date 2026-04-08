import { Doctor } from "../../domain/entities/doctor.entity";
import { DoctorDocument } from "../../schemas/doctor.schema";

/**
 * Pattern: Data Mapper
 * Decouples the Mongoose Doctor document from the Domain Entity.
 */
export class DoctorMapper {
  public static toDomain(doc: DoctorDocument): Doctor {
    return new Doctor(
      String(doc._id),
      doc.name,
      doc.specialty,
      doc.office,
      doc.status,
    );
  }
}
