import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AppointmentModule } from '../appointments/appointment.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CompleteExpiredAppointmentsUseCaseImpl } from '../application/use-cases/complete-expired-appointments.use-case.impl';
import { AssignAvailableOfficesUseCaseImpl } from '../application/use-cases/assign-available-offices.use-case.impl';
import { MaintenanceOrchestratorUseCaseImpl } from '../application/use-cases/maintenance-orchestrator.use-case.impl';

@Module({
    imports: [AppointmentModule, NotificationsModule, ConfigModule],
    providers: [
        SchedulerService,
        {
            provide: 'CompleteExpiredAppointmentsUseCase',
            inject: ['AppointmentRepository', 'NotificationPort', 'LoggerPort', 'ClockPort'],
            useFactory: (repo, notifier, logger, clock) => new CompleteExpiredAppointmentsUseCaseImpl(repo, notifier, logger, clock),
        },
        {
            provide: 'AssignAvailableOfficesUseCase',
            inject: ['AppointmentRepository', 'NotificationPort', 'LoggerPort', 'ClockPort', ConfigService],
            useFactory: (repo, notifier, logger, clock, config) => {
                const totalOffices = Number(config.get('CONSULTORIOS_TOTAL')) || 5;
                return new AssignAvailableOfficesUseCaseImpl(repo, notifier, logger, clock, totalOffices);
            },
        },
        {
            provide: 'MaintenanceOrchestratorUseCase',
            inject: ['CompleteExpiredAppointmentsUseCase', 'AssignAvailableOfficesUseCase', 'LoggerPort'],
            useFactory: (complete, assign, logger) => new MaintenanceOrchestratorUseCaseImpl(complete, assign, logger),
        },
    ],
    exports: [SchedulerService],
})
export class SchedulerModule { }
