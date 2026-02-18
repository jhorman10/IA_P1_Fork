import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');

    // ⚕️ HUMAN CHECK - Hybrid App: HTTP (Health) + Microservice
    // Se cambia de createMicroservice a create para tener puerto HTTP
    // y permitir Healthchecks de Docker/K8s.
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    const rabbitUrl = configService.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';
    const queueName = configService.get<string>('RABBITMQ_QUEUE') ?? 'turnos_queue';

    app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.RMQ,
        options: {
            urls: [rabbitUrl],
            queue: queueName,
            noAck: false,
            queueOptions: {
                durable: true,
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

    // El Consumer ahora escucha en el puerto 3001 (interno al contenedor)
    // solo para health checks y métricas futuras.
    const port = configService.get<number>('PORT') ?? 3000;
    await app.listen(port);

    logger.log(`Consumer (Worker) running hybrid mode on port ${port}`);
    logger.log(`Listening for tasks on queue: ${queueName}`);
}
bootstrap();
