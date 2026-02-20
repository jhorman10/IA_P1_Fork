import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AppointmentModule } from "../appointments/appointment.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { SchedulerService } from "./scheduler.service";

@Module({
  imports: [
    AppointmentModule, // Necesario para providers de casos de uso y LoggerPort
    NotificationsModule,
    ConfigModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
