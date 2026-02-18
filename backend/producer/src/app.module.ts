import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { ProducerController } from './producer.controller';
import { HealthController } from './health.controller';
import { ProducerService } from './producer.service';
import { AppointmentModule } from './appointments/appointment.module';
import { EventsModule } from './events/events.module';
import { RabbitMQPublisherAdapter } from './infrastructure/adapters/outbound/rabbitmq-publisher.adapter';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        // ⚕️ HUMAN CHECK - Conexión a MongoDB (lectura)
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGODB_URI') || 'mongodb://admin:admin123@localhost:27017/appointments_db?authSource=admin',
            }),
            inject: [ConfigService],
        }),
        ClientsModule.registerAsync([
            {
                name: 'APPOINTMENTS_SERVICE',
                imports: [ConfigModule],
                useFactory: async (configService: ConfigService) => ({
                    transport: Transport.RMQ,
                    options: {
                        urls: [configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672'],
                        queue: configService.get<string>('RABBITMQ_QUEUE') || 'appointment_queue',
                        queueOptions: {
                            durable: true,
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
        AppointmentModule,
        EventsModule,
    ],
    controllers: [ProducerController, HealthController],
    providers: [
        ProducerService,
        {
            provide: 'AppointmentPublisherPort',
            useClass: RabbitMQPublisherAdapter,
        },
    ],
})
export class AppModule { }
