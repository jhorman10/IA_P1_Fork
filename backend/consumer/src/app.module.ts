import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";

import { AppointmentModule } from "./appointments/appointment.module";
import { ConsumerController } from "./consumer.controller";
import { HealthController } from "./health.controller";
import { RetryPolicyAdapter } from "./infrastructure/messaging/retry-policy.adapter";
import { NotificationsModule } from "./notifications/notifications.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    // ⚕️ HUMAN CHECK - Conexión a MongoDB
    // Verificar que la URI de conexión sea correcta y accesible desde el contenedor
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AppointmentModule,
    SchedulerModule,
    NotificationsModule,
  ],
  controllers: [HealthController, ConsumerController],
  providers: [
    {
      provide: "RetryPolicyPort",
      useClass: RetryPolicyAdapter,
    },
  ],
})
export class AppModule {}
