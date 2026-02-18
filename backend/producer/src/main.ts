import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import 'reflect-metadata';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    // 🛡️ HUMAN CHECK - Seguridad de Headers (Helmet)
    // Reduce la superficie de ataque configurando headers HTTP seguros
    const helmet = require('helmet');
    app.use(helmet());

    // 🛡️ HUMAN CHECK - CORS restringido
    // En producción, solo permitimos el origen del frontend
    const configService = app.get(ConfigService);
    const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';

    app.enableCors({
        origin: frontendUrl,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });

    // Habilitar validación global (class-validator)
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    // ⚕️ HUMAN CHECK - Swagger Configuration
    // Review info before deployment
    const config = new DocumentBuilder()
        .setTitle('Medical Appointments API')
        .setDescription(
            'API for medical appointment management. ' +
            'Receives appointment requests and sends them to a RabbitMQ queue for asynchronous processing. ' +
            'Appointments are assigned to offices by a scheduler every 15 seconds. ' +
            'Changes are emitted in real-time via WebSocket at /ws/appointments.'
        )
        .setVersion('2.0')
        .addTag('Appointments', 'Management operations for medical appointments')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    const port = configService.get<number>('PORT') ?? 3000;

    // ⚕️ HUMAN CHECK - Hybrid App: HTTP + Microservice (RabbitMQ listener)
    // The Producer listens for events from the Consumer (appointment_created, appointment_updated)
    // to forward them via WebSocket to connected clients
    const rabbitUrl = configService.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';
    const notificationsQueue = configService.get<string>('RABBITMQ_NOTIFICATIONS_QUEUE') ?? 'appointment_notifications';

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue: notificationsQueue,
            queueOptions: {
                durable: true,
            },
            noAck: true,
        },
    });

    await app.startAllMicroservices();
    await app.listen(port);

    // ⚕️ HUMAN CHECK - Replaced console.log with Logger (consistency)
    logger.log(`Producer running on port ${port}`);
    logger.log(`Swagger docs: http://localhost:${port}/api/docs`);
    logger.log(`WebSocket: ws://localhost:${port}/ws/appointments`);
    logger.log(`Listening for notifications on queue: ${notificationsQueue}`);
}
bootstrap();
