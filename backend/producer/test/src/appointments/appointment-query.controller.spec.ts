import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { AppointmentQueryController } from "src/appointments/appointment-query.controller";
import * as request from "supertest";

/**
 * ⚕️ HUMAN CHECK - Test de Integración del Query Controller:
 * AppointmentQueryController maneja las QUERIES (GET), mientras que
 * ProducerController maneja los COMMANDS (POST).
 * Esta separación es CQRS (Command Query Responsibility Separation).
 */
describe("AppointmentQueryController (Integration Tests)", () => {
  let app: INestApplication;
  interface QueryAppointmentsUseCaseMock {
    findAll: jest.Mock;
    findByIdCard: jest.Mock;
  }
  let queryAppointmentsUseCase: QueryAppointmentsUseCaseMock;

  beforeEach(async () => {
    const mockQueryAppointmentsUseCase = {
      findAll: jest.fn(),
      findByIdCard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppointmentQueryController],
      providers: [
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

    queryAppointmentsUseCase = module.get("QueryAppointmentsUseCase");

    // Mock AppointmentMapper.toResponseDtoList
    jest.doMock("src/mappers/appointment.mapper", () => ({
      AppointmentMapper: {
        toResponseDtoList: (items: any[]) => items,
      },
    }));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe("GET /appointments - Query all appointments", () => {
    it("should return all appointments", async () => {
      // R-11: Test que faltaba en ProducerController.spec.ts
      const expectedAppointments = [
        {
          id: "apt-001",
          idCard: 123456789,
          fullName: "John Doe",
          office: "3",
          status: "called",
          priority: "medium",
          timestamp: 1645000000000,
        },
        {
          id: "apt-002",
          idCard: 111111111,
          fullName: "Jane Smith",
          office: "5",
          status: "waiting",
          priority: "high",
          timestamp: 1645000100000,
        },
      ];

      queryAppointmentsUseCase.findAll.mockResolvedValue(expectedAppointments);

      const response = await request(app.getHttpServer())
        .get("/appointments")
        .expect(200);

      expect(response.body).toEqual(expectedAppointments);
      expect(queryAppointmentsUseCase.findAll).toHaveBeenCalled();
    });

    it("should return empty array if no appointments exist", async () => {
      queryAppointmentsUseCase.findAll.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get("/appointments")
        .expect(200);

      expect(response.body).toEqual([]);
      expect(queryAppointmentsUseCase.findAll).toHaveBeenCalled();
    });
  });

  describe("GET /appointments/:idCard - Query by ID card", () => {
    it("should return appointments for a valid ID card", async () => {
      // R-12: Test que faltaba en ProducerController.spec.ts
      const idCard = 123456789;
      const expectedAppointments = [
        {
          id: "apt-001",
          idCard: 123456789,
          fullName: "John Doe",
          office: "3",
          status: "called",
          priority: "medium",
          timestamp: 1645000000000,
        },
      ];

      queryAppointmentsUseCase.findByIdCard.mockResolvedValue(
        expectedAppointments,
      );

      const response = await request(app.getHttpServer())
        .get(`/appointments/${idCard}`)
        .expect(200);

      expect(response.body).toEqual(expectedAppointments);
      expect(queryAppointmentsUseCase.findByIdCard).toHaveBeenCalledWith(
        idCard,
      );
    });

    it("should return empty array if no appointments found for idCard", async () => {
      // R-12 variant: No appointments but valid ID card
      const idCard = 999999999;

      queryAppointmentsUseCase.findByIdCard.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/appointments/${idCard}`)
        .expect(200);

      expect(response.body).toEqual([]);
      expect(queryAppointmentsUseCase.findByIdCard).toHaveBeenCalledWith(
        idCard,
      );
    });

    it("should return 400 if idCard is not a valid number", async () => {
      // R-13: Test que esperaba 400 con parametro inválido
      await request(app.getHttpServer())
        .get("/appointments/invalid-text")
        .expect(400);
    });

    it("should return 400 if idCard is a decimal number", async () => {
      // R-13 variant: ParseIntPipe debe rechazar decimales
      await request(app.getHttpServer())
        .get("/appointments/123.45")
        .expect(400);
    });
  });
});
