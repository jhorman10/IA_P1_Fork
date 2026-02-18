import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');

    // ⚕️ HUMAN CHECK - Hybrid App: HTTP (Health) + Microservice
    // Switched from createMicroservice to create to have an HTTP port
    // and allow Docker/K8s Healthchecks.
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    const rabbitUrl = configService.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';
    const queueName = configService.get<string>('RABBITMQ_QUEUE') ?? 'appointment_queue';

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue: queueName,
            noAck: false,
            queueOptions: {
                durable: true,
                arguments: {
                    'x-dead-letter-exchange': 'appointment_dlx',
                    'x-dead-letter-routing-key': 'appointment_dlq'
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
