import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { SpecialtyServiceImpl } from "../application/use-cases/specialty.service.impl";
import { MongooseSpecialtyRepository } from "../infrastructure/adapters/outbound/mongoose-specialty.repository";
import { Doctor, DoctorSchema } from "../schemas/doctor.schema";
import { Specialty, SpecialtySchema } from "../schemas/specialty.schema";
import { SpecialtiesController } from "./specialties.controller";
import { ProfilesModule } from "../profiles/profiles.module";

/**
 * SPEC-015: Módulo del catálogo de especialidades médicas.
 * Registra Doctor model para countDoctorsBySpecialtyId (integridad referencial en delete).
 * Exporta SPECIALTY_SERVICE_TOKEN para inyección en ProfilesModule.
 * Importa ProfilesModule via forwardRef para romper ciclo circular con ProfilesModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Specialty.name, schema: SpecialtySchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
    forwardRef(() => ProfilesModule),
  ],
  controllers: [SpecialtiesController],
  providers: [
    {
      provide: "SpecialtyRepository",
      useClass: MongooseSpecialtyRepository,
    },
    {
      provide: "SpecialtyService",
      useClass: SpecialtyServiceImpl,
    },
  ],
  exports: ["SpecialtyService"],
})
export class SpecialtiesModule {}
