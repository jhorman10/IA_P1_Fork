import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { FIREBASE_AUTH_PORT } from "src/domain/ports/outbound/firebase-auth.port";
import { PROFILE_REPOSITORY_TOKEN } from "src/domain/ports/outbound/profile.repository";
import { ProducerController } from "src/producer.controller";
import * as request from "supertest";

/**
 * ⚕️ HUMAN CHECK - Test de Integración Hexagonal:
 * El Controller depende de tokens de puertos inbound, no de servicios concretos.
 */
describe("ProducerController (Integration Tests)", () => {
  let app: INestApplication;
  interface CreateAppointmentUseCaseMock {
    execute: jest.Mock;
  }
  interface QueryAppointmentsUseCaseMock {
    findAll: jest.Mock;
    findByIdCard: jest.Mock;
  }
  let createAppointmentUseCase: CreateAppointmentUseCaseMock;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let queryAppointmentsUseCase: QueryAppointmentsUseCaseMock;

  beforeEach(async () => {
    const mockCreateAppointmentUseCase = {
      execute: jest.fn(),
    };

    const mockQueryAppointmentsUseCase = {
      findAll: jest.fn(),
      findByIdCard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProducerController],
      providers: [
        {
          provide: "CreateAppointmentUseCase",
          useValue: mockCreateAppointmentUseCase,
        },
        {
          provide: "QueryAppointmentsUseCase",
          useValue: mockQueryAppointmentsUseCase,
        },
        FirebaseAuthGuard,
        RoleGuard,
        Reflector,
        {
          provide: FIREBASE_AUTH_PORT,
          useValue: { verifyIdToken: jest.fn() },
        },
        {
          provide: PROFILE_REPOSITORY_TOKEN,
          useValue: { findByUid: jest.fn() },
        },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    createAppointmentUseCase = module.get("CreateAppointmentUseCase");
    queryAppointmentsUseCase = module.get("QueryAppointmentsUseCase");

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe("POST /appointments - Create appointment", () => {
    it("should create an appointment and return 202 Accepted", async () => {
      const createAppointmentDto = {
        idCard: 123456789,
        fullName: "John Doe",
      };

      // ⚕️ HUMAN CHECK - SRP: El Caso de Uso retorna void (Patrón Command).
      // El Controller es responsable de construir la respuesta HTTP.
      createAppointmentUseCase.execute.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post("/appointments")
        .send(createAppointmentDto)
        .expect(202);

      expect(response.body).toEqual({
        status: "accepted",
        message: "Asignación de turno en progreso",
      });

      // Verify mapping: DTO -> Command
      // HUMAN CHECK: Controller adds default priority if not provided
      expect(createAppointmentUseCase.execute).toHaveBeenCalledWith({
        idCard: 123456789,
        fullName: "John Doe",
        priority: "medium",
      });
    });

    it("should return 400 if idCard is missing", async () => {
      const invalidPayload = {
        fullName: "John Doe",
      };

      const response = await request(app.getHttpServer())
        .post("/appointments")
        .send(invalidPayload)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining("cédula")]),
      );
    });

    it("should return 400 if fullName is missing", async () => {
      const invalidPayload = {
        idCard: 123456789,
      };

      const response = await request(app.getHttpServer())
        .post("/appointments")
        .send(invalidPayload)
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining("nombre")]),
      );
    });

    it("should return 400 if idCard is not a number", async () => {
      const invalidPayload = {
        idCard: "invalid-text",
        fullName: "John Doe",
      };

      const response = await request(app.getHttpServer())
        .post("/appointments")
        .send(invalidPayload)
        .expect(400);

      expect(response.body.error).toBe("Bad Request");
    });

    it("should forward provided priority without overriding it", async () => {
      createAppointmentUseCase.execute.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post("/appointments")
        .send({
          idCard: 987654321,
          fullName: "Jane Smith",
          priority: "high",
        })
        .expect(202);

      expect(response.body).toEqual({
        status: "accepted",
        message: "Asignación de turno en progreso",
      });

      expect(createAppointmentUseCase.execute).toHaveBeenCalledWith({
        idCard: 987654321,
        fullName: "Jane Smith",
        priority: "high",
      });
    });
  });

  // ⚕️ HUMAN CHECK - Architectural Note:
  // GET /appointments endpoints are handled by AppointmentQueryController,
  // not ProducerController. Those tests are in appointment-query.controller.spec.ts
  // ProducerController ONLY handles POST /appointments (Command pattern).
});
