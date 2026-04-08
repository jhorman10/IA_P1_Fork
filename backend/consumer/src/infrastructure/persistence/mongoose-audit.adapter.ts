import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

import { AuditEntry, AuditPort } from "../../domain/ports/outbound/audit.port";
import { AuditLog, AuditLogDocument } from "../../schemas/audit-log.schema";

/**
 * Adapter: Infrastructure — Mongoose implementation of AuditPort.
 * SPEC-003: Persiste cada decisión de asignación con su contexto completo.
 * Write-only: solo insert, nunca modifica registros existentes.
 */
@Injectable()
export class MongooseAuditAdapter implements AuditPort {
  constructor(
    @InjectModel(AuditLog.name)
    private readonly model: Model<AuditLogDocument>,
  ) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.model.create({
      action: entry.action,
      appointmentId: entry.appointmentId,
      doctorId: entry.doctorId,
      details: entry.details,
      timestamp: entry.timestamp,
    });
  }
}
