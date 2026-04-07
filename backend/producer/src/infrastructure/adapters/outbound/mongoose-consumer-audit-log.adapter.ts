import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  ConsumerAuditAction,
  ConsumerAuditLogQueryPort,
  ConsumerAuditTimingEntry,
} from "../../../domain/ports/outbound/consumer-audit-log-query.port";
import {
  ConsumerAuditLogDocument,
  ConsumerAuditLogReadModel,
} from "../../../schemas/consumer-audit-log.schema";

/**
 * SPEC-013: Read-only adapter over the consumer's `audit_logs` collection.
 * Retrieves APPOINTMENT_ASSIGNED / APPOINTMENT_COMPLETED timing events
 * so the Operational Metrics use case can compute wait and consultation averages.
 *
 * Write-invariant: no create / update / delete operations are ever issued.
 */
@Injectable()
export class MongooseConsumerAuditLogAdapter implements ConsumerAuditLogQueryPort {
  constructor(
    @InjectModel(ConsumerAuditLogReadModel.name)
    private readonly model: Model<ConsumerAuditLogDocument>,
  ) {}

  async findTimingEvents(
    actions: ConsumerAuditAction[],
    fromMs: number,
  ): Promise<ConsumerAuditTimingEntry[]> {
    const docs = await this.model
      .find(
        {
          action: { $in: actions },
          appointmentId: { $ne: null },
          timestamp: { $gte: fromMs },
        },
        { action: 1, appointmentId: 1, timestamp: 1, _id: 0 },
      )
      .lean()
      .exec();

    return docs.map((doc) => ({
      appointmentId: doc.appointmentId ?? null,
      action: doc.action as ConsumerAuditAction,
      timestamp: doc.timestamp,
    }));
  }
}
