import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { MongooseModule } from "@nestjs/mongoose";

import { DoctorServiceImpl } from "../application/use-cases/doctor.service.impl";
import { RabbitMQDoctorPublisherAdapter } from "../infrastructure/adapters/outbound/rabbitmq-doctor-publisher.adapter";
import { MongooseDoctorRepository } from "../infrastructure/adapters/outbound/mongoose-doctor.repository";
import { Doctor, DoctorSchema } from "../schemas/doctor.schema";
import { DoctorController } from "./doctor.controller";

/**
 * SPEC-003: Módulo que encapsula toda la lógica de gestión de médicos en el Producer.
 * Registra su propio ClientProxy para publicar eventos RabbitMQ de check-in.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
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
  ],
  controllers: [DoctorController],
  providers: [
    {
      provide: "DoctorRepository",
      useClass: MongooseDoctorRepository,
    },
    {
      provide: "DoctorEventPublisherPort",
      useClass: RabbitMQDoctorPublisherAdapter,
    },
    {
      provide: "DoctorService",
      useClass: DoctorServiceImpl,
    },
  ],
  exports: ["DoctorService"],
})
export class DoctorModule {}
