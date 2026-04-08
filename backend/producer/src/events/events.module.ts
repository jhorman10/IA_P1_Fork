import { Module } from "@nestjs/common";

import { AppointmentModule } from "../appointments/appointment.module";
import { WsFirebaseAuthGuard } from "../auth/guards/ws-firebase-auth.guard";
import { ProfilesModule } from "../profiles/profiles.module";
import { AppointmentsGateway } from "./appointments.gateway";
import { CompoundBroadcaster } from "./compound-broadcaster";
import { EventsController } from "./events.controller";
import { OperationalAppointmentsGateway } from "./operational-appointments.gateway";

// ⚕️ HUMAN CHECK - Módulo Hexagonal
// Vincula EventBroadcasterPort → CompoundBroadcaster (DIP)
// CompoundBroadcaster delega a AppointmentsGateway y OperationalAppointmentsGateway
// Importa AppointmentModule que exporta el puerto 'QueryAppointmentsUseCase'
// Importa ProfilesModule para proveer FIREBASE_AUTH_PORT y PROFILE_REPOSITORY_TOKEN
// que requiere WsFirebaseAuthGuard (usado por OperationalAppointmentsGateway)
@Module({
  imports: [AppointmentModule, ProfilesModule],
  controllers: [EventsController],
  providers: [
    AppointmentsGateway,
    OperationalAppointmentsGateway,
    WsFirebaseAuthGuard,
    CompoundBroadcaster,
    {
      provide: "EventBroadcasterPort",
      useExisting: CompoundBroadcaster,
    },
  ],
})
export class EventsModule {}
