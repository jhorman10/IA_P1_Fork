import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClientsModule, Transport } from "@nestjs/microservices";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: "APPOINTMENT_NOTIFICATIONS",
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [configService.getOrThrow<string>("RABBITMQ_URL")],
            queue: configService.getOrThrow<string>(
              "RABBITMQ_NOTIFICATIONS_QUEUE",
            ),
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [NotificationsService],
  exports: [NotificationsService, ClientsModule],
})
export class NotificationsModule {}
