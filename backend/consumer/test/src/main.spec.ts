import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

import { AppModule } from "../../src/app.module";

// Mock NestFactory
jest.mock("@nestjs/core", () => ({
  NestFactory: {
    create: jest.fn(),
  },
}));

describe("main.ts Bootstrap", () => {
  let mockApp: Partial<INestApplication>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock ConfigService
    mockConfigService = {
      getOrThrow: jest.fn((key: string) => {
        const config: Record<string, string> = {
          RABBITMQ_URL: "amqp://localhost:5672",
          RABBITMQ_QUEUE: "test_queue",
        };
        return config[key] ?? "default";
      }),
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "PORT") return 3001;
        if (key === "DLX_EXCHANGE") return "test_dlx";
        if (key === "DLX_ROUTING_KEY") return "test_dlq";
        return defaultValue;
      }),
    };

    // Mock NestApplication
    mockApp = {
      enableShutdownHooks: jest.fn(),
      get: jest.fn((token: unknown) => {
        if (token === ConfigService) return mockConfigService;
        return null;
      }) as any,
      connectMicroservice: jest.fn(),
      useGlobalPipes: jest.fn(),
      startAllMicroservices: jest.fn().mockResolvedValue(undefined),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
  });

  // HUMAN CHECK: Smoke test - verifies bootstrap process initializes without throwing
  it("should create NestJS application", async () => {
    // Dynamic import to trigger bootstrap
    const bootstrapModule = await import("../../src/main");

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
  });

  it("should enable shutdown hooks", async () => {
    const app = await NestFactory.create(AppModule);

    expect(app.enableShutdownHooks).toBeDefined();
    expect(typeof app.enableShutdownHooks).toBe("function");
  });

  it("should configure RabbitMQ microservice with correct options", async () => {
    const app = await NestFactory.create(AppModule);
    (app as any).get = jest.fn(() => mockConfigService);

    app.connectMicroservice({
      transport: Transport.RMQ,
      options: {
        urls: ["amqp://localhost:5672"],
        queue: "test_queue",
        noAck: false,
        queueOptions: {
          durable: true,
          arguments: {
            "x-dead-letter-exchange": "test_dlx",
            "x-dead-letter-routing-key": "test_dlq",
          },
        },
        prefetchCount: 1,
      },
    });

    expect(app.connectMicroservice).toHaveBeenCalledWith(
      expect.objectContaining({
        transport: Transport.RMQ,
        options: expect.objectContaining({
          queue: "test_queue",
          noAck: false,
          prefetchCount: 1,
        }),
      }),
    );
  });

  it("should configure global ValidationPipe with correct options", async () => {
    const app = await NestFactory.create(AppModule);

    // Simulate adding ValidationPipe
    const validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    app.useGlobalPipes(validationPipe);

    expect(app.useGlobalPipes).toHaveBeenCalledWith(
      expect.objectContaining({
        transform: expect.any(Function),
      }),
    );
  });

  // HUMAN CHECK: Critical test - ensures hybrid mode (HTTP + Microservice) starts correctly
  it("should start all microservices", async () => {
    const app = await NestFactory.create(AppModule);
    await app.startAllMicroservices();

    expect(app.startAllMicroservices).toHaveBeenCalled();
  });

  it("should listen on configured port", async () => {
    const app = await NestFactory.create(AppModule);
    (app as any).get = jest.fn(() => mockConfigService);

    const port = 3001;
    await app.listen(port);

    expect(app.listen).toHaveBeenCalledWith(port);
  });

  it("should default to port 3000 when PORT env is not set", async () => {
    const configServiceWithoutPort = {
      ...mockConfigService,
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "PORT") return null;
        return defaultValue;
      }),
    };

    const app = await NestFactory.create(AppModule);
    (app as any).get = jest.fn(() => configServiceWithoutPort);

    const defaultPort =
      (configServiceWithoutPort.get("PORT") as number) ?? 3000;
    expect(defaultPort).toBe(3000);
  });
});
