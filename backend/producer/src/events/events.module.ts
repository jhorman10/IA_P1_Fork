import { Module } from '@nestjs/common';
import { AppointmentsGateway } from './appointments.gateway';
import { EventsController } from './events.controller';
import { AppointmentModule } from '../appointments/appointment.module';

// ⚕️ HUMAN CHECK - Hexagonal Module
// Binds EventBroadcasterPort → AppointmentsGateway (DIP)
// Imports AppointmentModule which exports 'QueryAppointmentsUseCase' port
@Module({
    imports: [AppointmentModule],
    controllers: [EventsController],
    providers: [
        AppointmentsGateway,
        {
            provide: 'EventBroadcasterPort',
            useExisting: AppointmentsGateway,
        },
    ],
    exports: [AppointmentsGateway],
})
export class EventsModule { }
