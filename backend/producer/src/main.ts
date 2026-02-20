import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { INestApplication, Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import "reflect-metadata";
import helmet from "helmet";
import { DomainExceptionFilter } from "./infrastructure/filters/domain-exception.filter";

// ⚕️ HUMAN CHECK - SRP: Bootstrap descompuesto en funciones especializadas.
// Cada función tiene una única responsabilidad. Agregar nuevo middleware = nueva función.

function configureSecurityMiddleware(
  app: INestApplication,
  frontendUrl: string,
): void {
  app.use(helmet());

  app.enableCors({
    origin: frontendUrl,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // 🛡️ HUMAN CHECK - Resiliencia: Mapea errores de dominio (VOs) a 400 en lugar de 500.
  app.useGlobalFilters(new DomainExceptionFilter());
}

function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Medical Appointments API")
    .setDescription(
      "API for medical appointment management. " +
        "Receives appointment requests and sends them to a RabbitMQ queue for asynchronous processing. " +
        "Appointments are assigned to offices by the scheduler. " +
        "Changes are emitted in real-time via WebSocket at /ws/appointments.",
    )
    .setVersion("2.0")
    .addTag("Appointments", "Management operations for medical appointments")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);
}

async function connectNotificationsMicroservice(
  app: INestApplication,
  rabbitUrl: string,
  queue: string,
): Promise<void> {
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rabbitUrl],
      queue,
      queueOptions: {
        durable: true,
      },
      noAck: true,
    },
  });

  await app.startAllMicroservices();
}

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);

  // 🛡️ HUMAN CHECK - Seguridad y validación
  const frontendUrl =
    configService.get<string>("FRONTEND_URL") || "http://localhost:3001";
  configureSecurityMiddleware(app, frontendUrl);

  // ⚕️ HUMAN CHECK - Documentación de la API
  configureSwagger(app);

  // ⚕️ HUMAN CHECK - Aplicación híbrida: HTTP + Microservicio (listener RabbitMQ)
  const rabbitUrl = configService.getOrThrow<string>("RABBITMQ_URL");
  const notificationsQueue = configService.getOrThrow<string>(
    "RABBITMQ_NOTIFICATIONS_QUEUE",
  );
  await connectNotificationsMicroservice(app, rabbitUrl, notificationsQueue);

  const port = configService.get<number>("PORT") ?? 3000;
  await app.listen(port);

  logger.log(`Producer running on port ${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
  logger.log(`WebSocket: ws://localhost:${port}/ws/appointments`);
  logger.log(`Listening for notifications on queue: ${notificationsQueue}`);
}
bootstrap();
