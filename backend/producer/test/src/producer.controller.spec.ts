/* eslint-disable @typescript-eslint/no-explicit-any */
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
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
      ],
    }).compile();

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
  });

  // ⚕️ HUMAN CHECK - Architectural Note:
  // GET /appointments endpoints are handled by AppointmentQueryController,
  // not ProducerController. Those tests are in appointment-query.controller.spec.ts
  // ProducerController ONLY handles POST /appointments (Command pattern).
});
