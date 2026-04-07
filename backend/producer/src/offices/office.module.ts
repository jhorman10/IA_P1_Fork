import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { OfficeServiceImpl } from "../application/use-cases/office.service.impl";
import { MongooseOfficeRepository } from "../infrastructure/adapters/outbound/mongoose-office.repository";
import { Doctor, DoctorSchema } from "../schemas/doctor.schema";
import { Office, OfficeSchema } from "../schemas/office.schema";
import { OfficeController } from "./office.controller";
import { ProfilesModule } from "../profiles/profiles.module";

/**
 * SPEC-016: Módulo del catálogo administrable de consultorios.
 *
 * - Importa el schema de Doctor para verificar ocupación en disable (igual que SpecialtiesModule
 *   importa Doctor para verificar referencias antes de borrar una especialidad), evitando
 *   dependencia circular con DoctorModule.
 * - Importa ProfilesModule via forwardRef para proveer FirebaseAuthGuard y RoleGuard a
 *   OfficeController. forwardRef rompe el ciclo OfficeModule→ProfilesModule→DoctorModule→OfficeModule.
 * - Exporta "OfficeRepository" y "OfficeService" para que DoctorModule pueda validar
 *   consultorios contra el catálogo en check-in y available-offices.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Office.name, schema: OfficeSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
    forwardRef(() => ProfilesModule),
  ],
  controllers: [OfficeController],
  providers: [
    {
      provide: "OfficeRepository",
      useClass: MongooseOfficeRepository,
    },
    {
      provide: "OfficeService",
      useClass: OfficeServiceImpl,
    },
  ],
  exports: ["OfficeRepository", "OfficeService"],
})
export class OfficeModule {}
