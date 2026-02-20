import { Module } from '@nestjs/common';
import { AppointmentsGateway } from './appointments.gateway';
import { EventsController } from './events.controller';
import { AppointmentModule } from '../appointments/appointment.module';

// ⚕️ HUMAN CHECK - Módulo Hexagonal
// Vincula EventBroadcasterPort → AppointmentsGateway (DIP)
// Importa AppointmentModule que exporta el puerto 'QueryAppointmentsUseCase'
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
    // exports: [AppointmentsGateway], // No exportar adaptador concreto
})
export class EventsModule { }
