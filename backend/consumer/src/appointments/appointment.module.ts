import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppointmentSchema as SchemaDef } from '../schemas/appointment.schema';

import { RegisterAppointmentUseCaseImpl } from '../application/use-cases/register-appointment.use-case.impl';
import { MongooseAppointmentRepository } from '../infrastructure/persistence/mongoose-appointment.repository';
import { NestLoggerAdapter } from '../infrastructure/logging/nest-logger.adapter';
import { SystemClockAdapter } from '../infrastructure/utils/system-clock.adapter';
import { RmqNotificationAdapter } from '../infrastructure/adapters/rmq-notification.adapter';
import { NotificationsModule } from '../notifications/notifications.module';
import { Appointment } from '../domain/entities/appointment.entity';
import { AppointmentRegisteredHandler, AppointmentAssignedHandler } from '../application/event-handlers/appointment-events.handler';
import { LocalDomainEventBusAdapter } from '../infrastructure/messaging/local-domain-event-bus.adapter';
import { MongooseLockRepository } from '../infrastructure/persistence/mongoose-lock.repository';
import { MaintenanceOrchestratorUseCaseImpl } from '../application/use-cases/maintenance-orchestrator.use-case.impl';
import { CompleteExpiredAppointmentsUseCaseImpl } from '../application/use-cases/complete-expired-appointments.use-case.impl';
import { AssignAvailableOfficesUseCaseImpl } from '../application/use-cases/assign-available-offices.use-case.impl';
import { ConsultationPolicy } from '../domain/policies/consultation.policy';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Appointment.name, schema: SchemaDef }]),
        NotificationsModule,
    ],
    providers: [
        {
            provide: 'AppointmentRepository',
            useClass: MongooseAppointmentRepository,
        },
        {
            provide: 'LockRepository',
            useClass: MongooseLockRepository,
        },
        {
            provide: 'LoggerPort',
            useClass: NestLoggerAdapter,
        },
        {
            provide: 'ClockPort',
            useClass: SystemClockAdapter,
        },
        {
            provide: 'NotificationPort',
            useClass: RmqNotificationAdapter,
        },
        ConsultationPolicy,
        AppointmentRegisteredHandler,
        AppointmentAssignedHandler,
        {
            provide: 'DomainEventBus',
            inject: [AppointmentRegisteredHandler, AppointmentAssignedHandler],
            useFactory: (registered, assigned) =>
                new LocalDomainEventBusAdapter([registered, assigned]),
        },
        {
            provide: 'CompleteExpiredAppointmentsUseCase',
            inject: ['AppointmentRepository', 'NotificationPort', 'LoggerPort', 'ClockPort'],
            useFactory: (repo, notification, logger, clock) =>
                new CompleteExpiredAppointmentsUseCaseImpl(repo, notification, logger, clock),
        },
        {
            provide: 'AssignAvailableOfficesUseCase',
            inject: ['AppointmentRepository', 'LoggerPort', 'ClockPort', 'DomainEventBus', ConsultationPolicy],
            useFactory: (repo, logger, clock, bus, policy) =>
                new AssignAvailableOfficesUseCaseImpl(repo, logger, clock, bus, 5, policy),
        },
        {
            provide: 'MaintenanceOrchestratorUseCase',
            inject: [
                'AssignAvailableOfficesUseCase',
                'CompleteExpiredAppointmentsUseCase',
                'LockRepository',
                'LoggerPort'
            ],
            useFactory: (assign, complete, lock, logger) =>
                new MaintenanceOrchestratorUseCaseImpl(assign, complete, lock, logger),
        },
        {
            provide: 'RegisterAppointmentUseCase',
            inject: ['AppointmentRepository', 'LoggerPort', 'DomainEventBus'],
            useFactory: (repo, logger, eventBus) => new RegisterAppointmentUseCaseImpl(repo, logger, eventBus),
        },
    ],
    exports: [

        'AppointmentRepository',
        'RegisterAppointmentUseCase',
        'LoggerPort',
        'ClockPort',
        'NotificationPort',
        'DomainEventBus',
        MongooseModule
    ],
})
export class AppointmentModule { }
