import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
                uri: configService.getOrThrow<string>('MONGODB_URI'),
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
                        urls: [configService.getOrThrow<string>('RABBITMQ_URL')],
                        queue: configService.getOrThrow<string>('RABBITMQ_QUEUE'),
                        queueOptions: {
                            durable: true,
                            arguments: {
                                'x-dead-letter-exchange': 'appointment_dlx',
                                'x-dead-letter-routing-key': 'appointment_dlq'
                            }
                        },
                    },
                }),
                inject: [ConfigService],
            },
        ]),
        AppointmentModule,
        EventsModule,
        // 🛡️ HUMAN CHECK - Proteccion contra ataques de fuerza bruta y DoS
        ThrottlerModule.forRoot([{
            ttl: 60000,
            limit: 10,
        }]),
    ],
    controllers: [ProducerController, HealthController],
    providers: [
        ProducerService,
        {
            provide: 'AppointmentPublisherPort',
            useClass: RabbitMQPublisherAdapter,
        },
        // 🛡️ HUMAN CHECK - Aplicar ThrottlerGuard globalmente
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
