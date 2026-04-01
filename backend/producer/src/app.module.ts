import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { CreateAppointmentUseCaseImpl } from "./application/use-cases/create-appointment.use-case.impl";
import { AppointmentModule } from "./appointments/appointment.module";
import { AppointmentQueryController } from "./appointments/appointment-query.controller";
import { DoctorModule } from "./doctors/doctor.module";
import { EventsModule } from "./events/events.module";
import { HealthController } from "./health.controller";
import { RabbitMQPublisherAdapter } from "./infrastructure/adapters/outbound/rabbitmq-publisher.adapter";
import { ProducerController } from "./producer.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    // ⚕️ HUMAN CHECK - Conexión a MongoDB (lectura)
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    ClientsModule.registerAsync([
      {
        name: "APPOINTMENTS_SERVICE",
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>("RABBITMQ_URL")],
            queue: configService.getOrThrow<string>("RABBITMQ_QUEUE"),
            queueOptions: {
              durable: true,
              arguments: {
                "x-dead-letter-exchange": configService.get<string>(
                  "DLX_EXCHANGE",
                  "appointment_dlx",
                ),
                "x-dead-letter-routing-key": configService.get<string>(
                  "DLX_ROUTING_KEY",
                  "appointment_dlq",
                ),
              },
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    AppointmentModule,
    DoctorModule,
    EventsModule,
    // 🛡️ HUMAN CHECK - Proteccion contra ataques de fuerza bruta y DoS
    // H-14 Fix: Relaxed limits (100 req/min) and ConfigService integration
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>("THROTTLE_TTL") ?? 60000,
          limit: config.get<number>("THROTTLE_LIMIT") ?? 100,
        },
      ],
    }),
  ],
  controllers: [
    ProducerController,
    AppointmentQueryController,
    HealthController,
  ],
  providers: [
    // ⚕️ HUMAN CHECK - Hexagonal: Bind inbound port → use-case implementation
    {
      provide: "CreateAppointmentUseCase",
      useClass: CreateAppointmentUseCaseImpl,
    },
    // Outbound port → infrastructure adapter
    {
      provide: "AppointmentPublisherPort",
      useClass: RabbitMQPublisherAdapter,
    },
    // 🛡️ HUMAN CHECK - Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
