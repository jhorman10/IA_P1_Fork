import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AppointmentModule } from '../appointments/appointment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CompleteExpiredAppointmentsUseCaseImpl } from '../application/use-cases/complete-expired-appointments.use-case.impl';
import { AssignAvailableOfficesUseCaseImpl } from '../application/use-cases/assign-available-offices.use-case.impl';
import { MaintenanceOrchestratorUseCaseImpl } from '../application/use-cases/maintenance-orchestrator.use-case.impl';
import { ConsultationPolicy } from '../domain/policies/consultation.policy';

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
