import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";

import { HealthController } from "./health.controller";
import { RetryPolicyAdapter } from "./infrastructure/messaging/retry-policy.adapter";

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
    // Mantener sólo la configuración mínima para que el servicio arranque.
    // Las funcionalidades de Scheduler / Notifications / Appointments se
    // reactivarán una vez se estabilice el wiring DI.
  ],
  // Temporalmente quitamos el ConsumerController para permitir que el
  // servicio arranque mientras se corrigen las dependencias DI de los
  // casos de uso. HealthController mantiene el endpoint /health.
  controllers: [HealthController],
  providers: [
    {
      provide: "RetryPolicyPort",
      useClass: RetryPolicyAdapter,
    },
  ],
})
export class AppModule {}
