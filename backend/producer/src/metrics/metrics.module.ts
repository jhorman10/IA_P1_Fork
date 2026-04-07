import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  OperationalMetricsUseCaseImpl,
  OPERATIONAL_METRICS_PORT,
} from "../application/use-cases/operational-metrics.use-case.impl";
import { AppointmentModule } from "../appointments/appointment.module";
import { DoctorModule } from "../doctors/doctor.module";
import { CONSUMER_AUDIT_LOG_QUERY_PORT } from "../domain/ports/outbound/consumer-audit-log-query.port";
import { MongooseConsumerAuditLogAdapter } from "../infrastructure/adapters/outbound/mongoose-consumer-audit-log.adapter";
import { ProfilesModule } from "../profiles/profiles.module";
import {
  ConsumerAuditLogReadModel,
  ConsumerAuditLogSchema,
} from "../schemas/consumer-audit-log.schema";
import { MetricsController } from "./metrics.controller";

/**
 * SPEC-013: MetricsModule — aggregates appointment and doctor data to serve
 * operational KPIs via GET /metrics (admin-only).
 *
 * Imports:
 *   - AppointmentModule: provides QueryAppointmentsUseCase
 *   - DoctorModule:      provides DoctorService
 *   - ProfilesModule:    provides FirebaseAuthGuard, RoleGuard, FIREBASE_AUTH_PORT,
 *                        PROFILE_REPOSITORY_TOKEN (required by FirebaseAuthGuard)
 *
 * Registers:
 *   - ConsumerAuditLogReadModel: read-only model over consumer's audit_logs
 *     collection (same MongoDB) — used to compute avgWaitTime / avgConsultationTime
 */
@Module({
  imports: [
    AppointmentModule,
    DoctorModule,
    ProfilesModule,
    MongooseModule.forFeature([
      {
        name: ConsumerAuditLogReadModel.name,
        schema: ConsumerAuditLogSchema,
      },
    ]),
  ],
  controllers: [MetricsController],
  providers: [
    {
      provide: CONSUMER_AUDIT_LOG_QUERY_PORT,
      useClass: MongooseConsumerAuditLogAdapter,
    },
    {
      provide: OPERATIONAL_METRICS_PORT,
      useClass: OperationalMetricsUseCaseImpl,
    },
  ],
})
export class MetricsModule {}
