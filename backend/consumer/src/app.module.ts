import { Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ScheduleModule } from "@nestjs/schedule";
import { ConsumerController } from "./consumer.controller";
import { HealthController } from "./health.controller";
import { AppointmentModule } from "./appointments/appointment.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { SchedulerService } from "./scheduler/scheduler.service";
import { RetryPolicyAdapter } from "./infrastructure/messaging/retry-policy.adapter";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    // ⚕️ HUMAN CHECK - Módulo de Schedule
    // Habilita el uso de @Interval y @Cron para el scheduler
    ScheduleModule.forRoot(),
    // ⚕️ HUMAN CHECK - Conexión a MongoDB
    // Verificar que la URI de conexión sea correcta y accesible desde el contenedor
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    // ⚕️ HUMAN CHECK - Cliente RabbitMQ para notificaciones
    // Publica eventos (turno_creado, turno_actualizado) al exchange de notificaciones
    // que el Producer escucha para hacer broadcast por WebSocket
    NotificationsModule,
    SchedulerModule,
    AppointmentModule,
  ],
  controllers: [ConsumerController, HealthController],
  providers: [
    {
      provide: "RetryPolicyPort",
      useClass: RetryPolicyAdapter,
    },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly schedulerService: SchedulerService) {}
  onModuleInit() {
    // Forzar la inicialización del SchedulerService
    void this.schedulerService;
  }
}
