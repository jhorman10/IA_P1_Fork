import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { DoctorServiceImpl } from "../application/use-cases/doctor.service.impl";
import { MongooseDoctorRepository } from "../infrastructure/adapters/outbound/mongoose-doctor.repository";
import { ProfilesModule } from "../profiles/profiles.module";
import { Doctor, DoctorSchema } from "../schemas/doctor.schema";
import { DoctorController } from "./doctor.controller";

/**
 * SPEC-003: DoctorModule — gestiona CRUD y disponibilidad de médicos.
 * Importa ProfilesModule via forwardRef para proveer FirebaseAuthGuard, RoleGuard
 * y DoctorContextGuard a DoctorController (ciclo: DoctorModule↔ProfilesModule).
 * Exporta "DoctorService" y "DoctorRepository" para uso en ProfilesModule y MetricsModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
    forwardRef(() => ProfilesModule),
  ],
  controllers: [DoctorController],
  providers: [
    {
      provide: "DoctorRepository",
      useClass: MongooseDoctorRepository,
    },
    {
      provide: "DoctorService",
      useClass: DoctorServiceImpl,
    },
  ],
  exports: ["DoctorService", "DoctorRepository"],
})
export class DoctorModule {}
