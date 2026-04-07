import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { QueryAppointmentsUseCaseImpl } from "../application/use-cases/query-appointments.use-case.impl";
import { MongooseAppointmentReadRepository } from "../infrastructure/adapters/outbound/mongoose-appointment-read.repository";
import { Appointment, AppointmentSchema } from "../schemas/appointment.schema";

// ⚕️ HUMAN CHECK - Módulo Hexagonal: Vincula puerto de entrada → caso de uso, puerto de salida → adaptador
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
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
  exports: ["QueryAppointmentsUseCase", "AppointmentReadRepository"],
})
export class AppointmentModule {}
