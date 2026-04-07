import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ProfilesModule } from "../profiles/profiles.module";

import { QueryAppointmentsUseCaseImpl } from "../application/use-cases/query-appointments.use-case.impl";
import { MongooseAppointmentReadRepository } from "../infrastructure/adapters/outbound/mongoose-appointment-read.repository";
import { Appointment, AppointmentSchema } from "../schemas/appointment.schema";
import { AppointmentLifecycleController } from "./appointment-lifecycle.controller";

// ⚕️ HUMAN CHECK - Módulo Hexagonal: Vincula puerto de entrada → caso de uso, puerto de salida → adaptador
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    ProfilesModule,
  ],
  providers: [
    {
      provide: "QueryAppointmentsUseCase",
      useClass: QueryAppointmentsUseCaseImpl,
    },
    {
      provide: "AppointmentReadRepository",
      useClass: MongooseAppointmentReadRepository,
    },
  ],
  controllers: [AppointmentLifecycleController],
  exports: ["QueryAppointmentsUseCase", "AppointmentReadRepository"],
})
export class AppointmentModule {}
