import { Module } from '@nestjs/common';
import { AppointmentsGateway } from './appointments.gateway';
import { EventsController } from './events.controller';
import { AppointmentModule } from '../appointments/appointment.module';

// ⚕️ HUMAN CHECK - Módulo de Eventos
// Imports AppointmentModule which exports 'QueryAppointmentsUseCase' port
@Module({
    imports: [AppointmentModule],
    controllers: [EventsController],
    providers: [AppointmentsGateway],
    exports: [AppointmentsGateway],
})
export class EventsModule { }
