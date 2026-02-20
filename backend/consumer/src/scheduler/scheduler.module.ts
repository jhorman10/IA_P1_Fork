import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AppointmentModule } from '../appointments/appointment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [
        AppointmentModule, // Necesario para providers de casos de uso y LoggerPort
        NotificationsModule,
        ConfigModule,
    ],
    providers: [
        SchedulerService,
    ],
    exports: [SchedulerService],
})
export class SchedulerModule { }
