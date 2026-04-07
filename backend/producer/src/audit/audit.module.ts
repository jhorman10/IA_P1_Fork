import { Global, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuditInterceptor } from "../common/interceptors/audit.interceptor";
import { OPERATIONAL_AUDIT_PORT } from "../domain/ports/outbound/operational-audit.port";
import { OPERATIONAL_AUDIT_QUERY_PORT } from "../domain/ports/outbound/operational-audit-query.port";
import { MongooseOperationalAuditAdapter } from "../infrastructure/adapters/outbound/mongoose-operational-audit.adapter";
import { ProfilesModule } from "../profiles/profiles.module";
import {
  OperationalAuditLog,
  OperationalAuditLogSchema,
} from "../schemas/operational-audit-log.schema";
import { AuditController } from "./audit.controller";

/**
 * SPEC-011: AuditModule — provides OperationalAuditPort and OperationalAuditQueryPort
 * for the producer microservice.
 *
 * @Global() — makes AuditInterceptor and port tokens injectable in all feature modules
 * without requiring each to explicitly import AuditModule.
 *
 * Imports ProfilesModule to provide FirebaseAuthGuard and RoleGuard to AuditController.
 */
@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: OperationalAuditLog.name,
        schema: OperationalAuditLogSchema,
      },
    ]),
    ProfilesModule,
  ],
  controllers: [AuditController],
  providers: [
    AuditInterceptor,
    {
      provide: OPERATIONAL_AUDIT_PORT,
      useClass: MongooseOperationalAuditAdapter,
    },
    {
      provide: OPERATIONAL_AUDIT_QUERY_PORT,
      useClass: MongooseOperationalAuditAdapter,
    },
  ],
  exports: [
    AuditInterceptor,
    OPERATIONAL_AUDIT_PORT,
    OPERATIONAL_AUDIT_QUERY_PORT,
  ],
})
export class AuditModule {}
