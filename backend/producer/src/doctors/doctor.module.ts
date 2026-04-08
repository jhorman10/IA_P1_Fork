import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { MongooseModule } from "@nestjs/mongoose";

import { DoctorServiceImpl } from "../application/use-cases/doctor.service.impl";
import { LIFECYCLE_PUBLISHER_TOKEN } from "../domain/ports/outbound/appointment-lifecycle-publisher.port";
import { MongooseDoctorRepository } from "../infrastructure/adapters/outbound/mongoose-doctor.repository";
import { RabbitMQLifecyclePublisherAdapter } from "../infrastructure/adapters/outbound/rabbitmq-lifecycle-publisher.adapter";
import { ProfilesModule } from "../profiles/profiles.module";
import { Doctor, DoctorSchema } from "../schemas/doctor.schema";
import { DoctorController } from "./doctor.controller";

/**
 * SPEC-003/015/016: DoctorModule — gestiona CRUD y disponibilidad de médicos.
 * Doctor schema is imported here for:
 *   - MongooseDoctorRepository (CRUD)
 *   - DoctorServiceImpl (inline office occupancy query for check-in / getAvailableOffices)
 * Exports "DoctorService" and "DoctorRepository" for use in ProfilesModule and MetricsModule.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Doctor.name, schema: DoctorSchema }]),
    forwardRef(() => ProfilesModule),
    ClientsModule.registerAsync([
      {
        name: "APPOINTMENTS_SERVICE",
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>("RABBITMQ_URL")],
            queue: configService.getOrThrow<string>("RABBITMQ_QUEUE"),
            queueOptions: { durable: true },
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
      provide: LIFECYCLE_PUBLISHER_TOKEN,
      useClass: RabbitMQLifecyclePublisherAdapter,
    },
    {
      provide: "DoctorService",
      useClass: DoctorServiceImpl,
    },
  ],
  exports: ["DoctorService", "DoctorRepository"],
})
export class DoctorModule {}
