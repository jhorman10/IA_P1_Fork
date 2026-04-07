import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import {
  OperationalAuditAction,
  OperationalAuditEntry,
  OperationalAuditPort,
} from "../../../domain/ports/outbound/operational-audit.port";
import {
  AuditLogFilters,
  AuditLogPage,
  OperationalAuditQueryPort,
} from "../../../domain/ports/outbound/operational-audit-query.port";
import {
  OperationalAuditLog,
  OperationalAuditLogDocument,
} from "../../../schemas/operational-audit-log.schema";

/**
 * SPEC-011: Adapter — Mongoose implementation of OperationalAuditPort + OperationalAuditQueryPort.
 * Persists operational audit events in the `operational_audit_logs` collection (producer).
 * Write-only invariant: no update or delete operations are ever issued.
 */
@Injectable()
export class MongooseOperationalAuditAdapter
  implements OperationalAuditPort, OperationalAuditQueryPort
{
  constructor(
    @InjectModel(OperationalAuditLog.name)
    private readonly model: Model<OperationalAuditLogDocument>,
  ) {}

  async log(entry: OperationalAuditEntry): Promise<void> {
    await this.model.create({
      action: entry.action,
      actorUid: entry.actorUid,
      targetUid: entry.targetUid ?? null,
      targetId: entry.targetId ?? null,
      details: entry.details,
      timestamp: entry.timestamp,
    });
  }

  async hasRecentEntry(
    actorUid: string,
    action: OperationalAuditAction,
    windowMs: number,
  ): Promise<boolean> {
    const since = Date.now() - windowMs;
    const count = await this.model
      .countDocuments({ actorUid, action, timestamp: { $gte: since } })
      .exec();
    return count > 0;
  }

  async findPaginated(
    filters: AuditLogFilters,
    page: number,
    limit: number,
  ): Promise<AuditLogPage> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const query: Record<string, unknown> = {};
    if (filters.action) query["action"] = filters.action;
    if (filters.actorUid) query["actorUid"] = filters.actorUid;
    if (filters.from !== undefined || filters.to !== undefined) {
      const range: Record<string, number> = {};
      if (filters.from !== undefined) range["$gte"] = filters.from;
      if (filters.to !== undefined) range["$lte"] = filters.to;
      query["timestamp"] = range;
    }

    const [docs, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(safeLimit)
        .exec(),
      this.model.countDocuments(query).exec(),
    ]);

    return {
      data: docs.map((doc) => this.toEntry(doc)),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  private toEntry(doc: OperationalAuditLogDocument): OperationalAuditEntry {
    const docWithTs = doc as OperationalAuditLogDocument & { createdAt?: Date };
    return {
      id: doc._id.toString(),
      createdAt: docWithTs.createdAt,
      action: doc.action,
      actorUid: doc.actorUid,
      targetUid: doc.targetUid,
      targetId: doc.targetId,
      details: doc.details,
      timestamp: doc.timestamp,
    };
  }
}
