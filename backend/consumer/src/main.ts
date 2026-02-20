import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');

    // ⚕️ HUMAN CHECK - Aplicación híbrida: HTTP (Health) + Microservicio
    // Se usa create en lugar de createMicroservice para tener un puerto HTTP
    // y permitir Healthchecks de Docker/K8s.
    const app = await NestFactory.create(AppModule);
    app.enableShutdownHooks();
    const configService = app.get(ConfigService);

    const rabbitUrl = configService.getOrThrow<string>('RABBITMQ_URL');
    const queueName = configService.getOrThrow<string>('RABBITMQ_QUEUE');

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue: queueName,
            noAck: false,
            queueOptions: {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': configService.get<string>('DLX_EXCHANGE', 'appointment_dlx'),
                    'x-dead-letter-routing-key': configService.get<string>('DLX_ROUTING_KEY', 'appointment_dlq'),
                }
            },
            prefetchCount: 1,
        },
    });

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    await app.startAllMicroservices();

    // The Consumer now listens on port 3000 (internal to container)
    // only for health checks and future metrics.
    const port = configService.get<number>('PORT') ?? 3000;
    await app.listen(port);

    logger.log(`Consumer (Worker) running hybrid mode on port ${port}`);
    logger.log(`Listening for tasks on queue: ${queueName}`);
}
bootstrap();
