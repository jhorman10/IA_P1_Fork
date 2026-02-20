import { AppointmentStatus } from "../../domain/entities/appointment.entity";

/**
 * Pattern: Builder (Infrastructure-specific)
 * Translates domain specifications into Mongoose query syntax.
 * ⚕️ HUMAN CHECK - H-32: Mueve sintaxis Mongoose ($in, $lte) fuera del dominio
 * DIP: El dominio define QUÉ buscar (ACTIVE_STATUSES), infrastructure define CÓMO (Mongoose syntax)
 */
export class MongooseQueryBuilder {
  /**
   * Build Mongoose filter for "Active" appointments.
   * @param activeStatuses - Business-defined list of active statuses from domain
   */
  static buildActiveFilter(activeStatuses: AppointmentStatus[]) {
    return {
      status: { $in: activeStatuses },
    };
  }

  /**
   * Build Mongoose filter for "Expired Called" appointments.
   * @param now - Current timestamp from Clock
   */
  static buildExpiredCalledFilter(now: number) {
    return {
      status: "called" as AppointmentStatus,
      completedAt: { $lte: now },
    };
  }
}
