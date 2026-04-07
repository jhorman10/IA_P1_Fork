import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { ProfileServiceImpl } from "../application/use-cases/profile.service.impl";
import { AuthController } from "../auth/auth.controller";
import { DoctorContextGuard } from "../auth/guards/doctor-context.guard";
import { FirebaseAuthGuard } from "../auth/guards/firebase-auth.guard";
import { FirebaseTokenOnlyGuard } from "../auth/guards/firebase-token-only.guard";
import { RoleGuard } from "../auth/guards/role.guard";
import { DoctorModule } from "../doctors/doctor.module";
import { PROFILE_SERVICE_TOKEN } from "../domain/ports/inbound/profile-service.port";
import { FIREBASE_AUTH_PORT } from "../domain/ports/outbound/firebase-auth.port";
import { PROFILE_REPOSITORY_TOKEN } from "../domain/ports/outbound/profile.repository";
import { PROFILE_AUDIT_LOG_REPOSITORY_TOKEN } from "../domain/ports/outbound/profile-audit-log.repository";
import { FirebaseAuthAdapter } from "../infrastructure/adapters/outbound/firebase-auth.adapter";
import { MongooseProfileRepository } from "../infrastructure/adapters/outbound/mongoose-profile.repository";
import { MongooseProfileAuditLogAdapter } from "../infrastructure/adapters/outbound/mongoose-profile-audit-log.adapter";
import { Profile, ProfileSchema } from "../schemas/profile.schema";
import {
  ProfileAuditLog,
  ProfileAuditLogSchema,
} from "../schemas/profile-audit-log.schema";
import { SpecialtiesModule } from "../specialties/specialty.module";
import { ProfilesController } from "./profiles.controller";

/**
 * SPEC-004: Profiles module.
 * SPEC-006: Registers FirebaseTokenOnlyGuard and ProfileAuditLogRepository.
 * SPEC-015: Imports DoctorModule (forwardRef) and SpecialtiesModule for transparent doctor creation.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: ProfileAuditLog.name, schema: ProfileAuditLogSchema },
    ]),
    forwardRef(() => DoctorModule),
    forwardRef(() => SpecialtiesModule),
  ],
  controllers: [AuthController, ProfilesController],
  providers: [
    {
      provide: FIREBASE_AUTH_PORT,
      useClass: FirebaseAuthAdapter,
    },
    {
      provide: PROFILE_REPOSITORY_TOKEN,
      useClass: MongooseProfileRepository,
    },
    {
      provide: PROFILE_AUDIT_LOG_REPOSITORY_TOKEN,
      useClass: MongooseProfileAuditLogAdapter,
    },
    {
      provide: PROFILE_SERVICE_TOKEN,
      useClass: ProfileServiceImpl,
    },
    // Guards registered as providers so NestJS DI can inject them
    FirebaseAuthGuard,
    FirebaseTokenOnlyGuard,
    RoleGuard,
    DoctorContextGuard,
  ],
  exports: [
    FIREBASE_AUTH_PORT,
    PROFILE_REPOSITORY_TOKEN,
    PROFILE_AUDIT_LOG_REPOSITORY_TOKEN,
    PROFILE_SERVICE_TOKEN,
    FirebaseAuthGuard,
    FirebaseTokenOnlyGuard,
    RoleGuard,
    DoctorContextGuard,
  ],
})
export class ProfilesModule {}
