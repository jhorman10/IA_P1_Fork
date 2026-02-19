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
        // ⚕️ HUMAN CHECK - OCP: Individual event handlers registered separately.
        // Adding new domain events only requires registering new handler classes.
        AppointmentRegisteredHandler,
        AppointmentAssignedHandler,
        {
            provide: 'DomainEventBus',
            inject: [AppointmentRegisteredHandler, AppointmentAssignedHandler],
            useFactory: (registered: AppointmentRegisteredHandler, assigned: AppointmentAssignedHandler) =>
                new LocalDomainEventBusAdapter([registered, assigned]),
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
