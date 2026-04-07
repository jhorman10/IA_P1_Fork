import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { QueryAppointmentsUseCaseImpl } from "../application/use-cases/query-appointments.use-case.impl";
import { GetQueuePositionUseCaseImpl } from "../application/use-cases/queue-position.use-case.impl";
import { MongooseAppointmentReadRepository } from "../infrastructure/adapters/outbound/mongoose-appointment-read.repository";
import { ProfilesModule } from "../profiles/profiles.module";
import { Appointment, AppointmentSchema } from "../schemas/appointment.schema";

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
    // SPEC-003: Posición en cola
    {
      provide: "GetQueuePositionUseCase",
      useClass: GetQueuePositionUseCaseImpl,
    },
    {
      provide: "AppointmentReadRepository",
      useClass: MongooseAppointmentReadRepository,
    },
  ],
  exports: [
    "QueryAppointmentsUseCase",
    "GetQueuePositionUseCase",
    "AppointmentReadRepository",
  ],
})
export class AppointmentModule {}
