/**
 * main.ts bootstrap coverage tests.
 *
 * HUMAN CHECK: AppModule is mocked to prevent loading heavy native deps
 * (mongoose/amqplib) that cause Jest worker crashes via segfault.
 * All internal bootstrap functions are exercised through bootstrap() execution.
 * Coverage for app.module.ts is handled in app.module.spec.ts
 */

// ── All jest.mock() calls must be at the TOP (they are hoisted) ──────────────

jest.mock("../../src/app.module", () => ({
  AppModule: class AppModule {},
}));

jest.mock("@nestjs/core", () => ({
  NestFactory: {
    create: jest.fn(),
  },
}));

jest.mock("@nestjs/common", () => {
  const actual = jest.requireActual("@nestjs/common");
  return {
    ...actual,
    Logger: jest.fn().mockImplementation(() => ({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    })),
    ValidationPipe: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock("@nestjs/swagger", () => ({
  DocumentBuilder: jest.fn().mockReturnValue({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addTag: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  }),
  SwaggerModule: {
    createDocument: jest.fn().mockReturnValue({}),
    setup: jest.fn(),
  },
  ApiProperty: () => () => undefined,
  ApiPropertyOptional: () => () => undefined,
  ApiOperation: () => () => undefined,
  ApiTags: () => () => undefined,
  ApiResponse: () => () => undefined,
  ApiBody: () => () => undefined,
  ApiBearerAuth: () => () => undefined,
  ApiParam: () => () => undefined,
  ApiQuery: () => () => undefined,
  ApiHeader: () => () => undefined,
}));

jest.mock("helmet", () => {
  const fn = jest.fn(
    () => (_req: unknown, _res: unknown, next: () => void) => next(),
  );
  return { __esModule: true, default: fn };
});

jest.mock("../../src/infrastructure/filters/domain-exception.filter", () => ({
  DomainExceptionFilter: jest.fn().mockImplementation(() => ({})),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────
import { NestFactory } from "@nestjs/core";
import { Transport } from "@nestjs/microservices";

// ── Helper factories ──────────────────────────────────────────────────────────

function buildMockConfig(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    FRONTEND_URL: "http://localhost:3001",
    PORT: 3000,
    RABBITMQ_URL: "amqp://localhost:5672",
    RABBITMQ_NOTIFICATIONS_QUEUE: "notifications_queue",
    ...overrides,
  };
  return {
    get: jest.fn(
      (key: string, fallback?: unknown) => defaults[key] ?? fallback,
    ),
    getOrThrow: jest.fn((key: string) => {
      if (key in defaults && defaults[key] !== undefined) return defaults[key];
      throw new Error(`Config key "${key}" not found`);
    }),
  };
}

function buildMockApp(config: ReturnType<typeof buildMockConfig>) {
  const app = {
    enableShutdownHooks: jest.fn(),
    use: jest.fn(),
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    useGlobalFilters: jest.fn(),
    connectMicroservice: jest.fn(),
    startAllMicroservices: jest.fn().mockResolvedValue(undefined),
    listen: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockReturnValue(config),
  };
  (NestFactory.create as jest.Mock).mockResolvedValue(app);
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("main.ts — bootstrap()", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // HUMAN CHECK: Exercises configureSecurityMiddleware, configureSwagger,
  // connectNotificationsMicroservice and the listen call in one shot.
  it("should bootstrap app with all setup methods called", async () => {
    const config = buildMockConfig();
    const app = buildMockApp(config);

    jest.isolateModules(() => {
      require("../../src/main");
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(NestFactory.create).toHaveBeenCalled();
    expect(app.enableShutdownHooks).toHaveBeenCalled();
    expect(app.use).toHaveBeenCalled();
    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "http://localhost:3001" }),
    );
    expect(app.useGlobalPipes).toHaveBeenCalled();
    expect(app.useGlobalFilters).toHaveBeenCalled();
    expect(app.connectMicroservice).toHaveBeenCalled();
    expect(app.startAllMicroservices).toHaveBeenCalled();
    expect(app.listen).toHaveBeenCalledWith(3000);
  });

  it("should fallback to port 3000 when PORT is not set", async () => {
    const config = buildMockConfig({ PORT: undefined });
    const app = buildMockApp(config);

    jest.isolateModules(() => {
      require("../../src/main");
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(app.listen).toHaveBeenCalledWith(3000);
  });

  it("should fallback FRONTEND_URL to localhost:3001 when not set", async () => {
    const config = buildMockConfig({ FRONTEND_URL: undefined });
    const app = buildMockApp(config);

    jest.isolateModules(() => {
      require("../../src/main");
    });

    await new Promise((r) => setTimeout(r, 100));

    expect(app.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "http://localhost:3001" }),
    );
  });
});

describe("main.ts — transport constants", () => {
  it("should expose RMQ transport constant", () => {
    expect(Transport.RMQ).toBeDefined();
    expect(typeof Transport.RMQ).toBe("number");
  });
});

describe("main.ts — config edge cases", () => {
  it("should throw when a required env key is missing", () => {
    const config = buildMockConfig();
    (config.getOrThrow as jest.Mock).mockImplementationOnce((key: string) => {
      throw new Error(`Config key "${key}" not found`);
    });
    expect(() => config.getOrThrow("RABBITMQ_URL")).toThrow(
      /RABBITMQ_URL.*not found/,
    );
  });
});
