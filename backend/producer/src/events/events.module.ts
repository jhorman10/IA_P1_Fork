import { Module } from '@nestjs/common';
import { AppointmentsGateway } from './appointments.gateway';
import { EventsController } from './events.controller';
import { AppointmentModule } from '../appointments/appointment.module';

// ⚕️ HUMAN CHECK - Módulo de Eventos
// Conecta el WebSocket Gateway con el controlador de eventos RabbitMQ
@Module({
    imports: [AppointmentModule],
    controllers: [EventsController],
    providers: [AppointmentsGateway],
    exports: [AppointmentsGateway],
})
export class EventsModule { }
