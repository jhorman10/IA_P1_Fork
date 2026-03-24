import { Module } from "@nestjs/common";

import { AppointmentModule } from "../appointments/appointment.module";
import { AppointmentsGateway } from "./appointments.gateway";
import { EventsController } from "./events.controller";

// ⚕️ HUMAN CHECK - Módulo Hexagonal
// Vincula EventBroadcasterPort → AppointmentsGateway (DIP)
// Importa AppointmentModule que exporta el puerto 'QueryAppointmentsUseCase'
@Module({
  imports: [AppointmentModule],
  controllers: [EventsController],
  providers: [
    AppointmentsGateway,
    {
      provide: "EventBroadcasterPort",
      useExisting: AppointmentsGateway,
    },
  ],
  // exports: [AppointmentsGateway], // No exportar adaptador concreto
})
export class EventsModule {}
