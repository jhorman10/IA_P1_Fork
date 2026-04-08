import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DoctorContextGuard } from "src/auth/guards/doctor-context.guard";
import { FirebaseAuthGuard } from "src/auth/guards/firebase-auth.guard";
import { RoleGuard } from "src/auth/guards/role.guard";
import { DoctorController } from "src/doctors/doctor.controller";
import * as request from "supertest";

describe("DoctorController (Integration Tests)", () => {
  let app: INestApplication;
  let doctorService: {
    createDoctor: jest.Mock;
    findAll: jest.Mock;
    findById: jest.Mock;
    checkIn: jest.Mock;
    checkOut: jest.Mock;
  };

  const doctorFixture = {
    id: "doc-001",
    name: "Dr. Ana Perez",
    specialty: "Medicina General",
    office: "3",
    status: "offline",
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };

  beforeEach(async () => {
    const mockDoctorService = {
      createDoctor: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      checkIn: jest.fn(),
      checkOut: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorController],
      providers: [
        {
          provide: "DoctorService",
          useValue: mockDoctorService,
        },
      ],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(DoctorContextGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    doctorService = module.get("DoctorService");
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it("should create doctor", async () => {
    doctorService.createDoctor.mockResolvedValue(doctorFixture);

    const response = await request(app.getHttpServer())
      .post("/doctors")
      .send({
        name: "Dr. Ana Perez",
        specialty: "Medicina General",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: "doc-001",
      name: "Dr. Ana Perez",
      specialty: "Medicina General",
      status: "offline",
    });
    expect(doctorService.createDoctor).toHaveBeenCalledWith({
      name: "Dr. Ana Perez",
      specialty: "Medicina General",
      office: null,
    });
  });

  it("should return 400 when name is missing", async () => {
    const response = await request(app.getHttpServer())
      .post("/doctors")
      .send({
        specialty: "Medicina General",
      })
      .expect(400);

    expect(response.body.message).toContain("El nombre es obligatorio");
    expect(doctorService.createDoctor).not.toHaveBeenCalled();
  });

  it("should check in a doctor", async () => {
    doctorService.checkIn.mockResolvedValue({
      ...doctorFixture,
      status: "available",
    });

    const response = await request(app.getHttpServer())
      .patch("/doctors/doc-001/check-in")
      .send({ office: "3" })
      .expect(200);

    expect(response.body).toMatchObject({
      id: "doc-001",
      name: "Dr. Ana Perez",
      office: "3",
      status: "available",
      message: "Médico registrado como disponible",
    });
    expect(doctorService.checkIn).toHaveBeenCalledWith("doc-001", "3");
  });

  it("should return 409 if doctor is already available on check-in", async () => {
    doctorService.checkIn.mockRejectedValue(
      new ConflictException("El médico ya está disponible"),
    );

    const response = await request(app.getHttpServer())
      .patch("/doctors/doc-001/check-in")
      .send({ office: "3" })
      .expect(409);

    expect(response.body.message).toBe("El médico ya está disponible");
  });

  it("should check out a doctor", async () => {
    doctorService.checkOut.mockResolvedValue({
      ...doctorFixture,
      status: "offline",
    });

    const response = await request(app.getHttpServer())
      .patch("/doctors/doc-001/check-out")
      .expect(200);

    expect(response.body).toMatchObject({
      id: "doc-001",
      name: "Dr. Ana Perez",
      office: "3",
      status: "offline",
      message: "Médico registrado como no disponible",
    });
    expect(doctorService.checkOut).toHaveBeenCalledWith("doc-001");
  });

  it("should return 409 when doctor is busy on check-out", async () => {
    doctorService.checkOut.mockRejectedValue(
      new ConflictException(
        "El médico tiene un paciente asignado, no puede hacer check-out",
      ),
    );

    const response = await request(app.getHttpServer())
      .patch("/doctors/doc-001/check-out")
      .expect(409);

    expect(response.body.message).toContain("no puede hacer check-out");
  });

  it("should list doctors filtered by status", async () => {
    doctorService.findAll.mockResolvedValue([
      {
        ...doctorFixture,
        status: "available",
      },
    ]);

    const response = await request(app.getHttpServer())
      .get("/doctors?status=available")
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      id: "doc-001",
      status: "available",
      office: "3",
    });
    expect(doctorService.findAll).toHaveBeenCalledWith("available");
  });
});
