import { BadRequestException, ConflictException } from "@nestjs/common";

import { DoctorServiceImpl } from "src/application/use-cases/doctor.service.impl";
import { DoctorView } from "src/domain/models/doctor-view";
import { DoctorServicePort } from "src/domain/ports/inbound/doctor-service.port";
import { DoctorEventPublisherPort } from "src/domain/ports/outbound/doctor-event-publisher.port";
import { DoctorRepository } from "src/domain/ports/outbound/doctor.repository";
import { OfficeRepository } from "src/domain/ports/outbound/office.repository";

describe("DoctorServiceImpl", () => {
  let service: DoctorServicePort;
  let repo: jest.Mocked<DoctorRepository>;
  let publisher: jest.Mocked<DoctorEventPublisherPort>;
  let officeRepo: jest.Mocked<OfficeRepository>;

  const doctorFixture: DoctorView = {
    id: "doc-001",
    name: "Dr. Ana Perez",
    specialty: "Medicina General",
    office: null,
    status: "offline",
    specialtyId: "spec-001",
    createdAt: new Date("2026-04-06T10:00:00.000Z"),
    updatedAt: new Date("2026-04-06T10:00:00.000Z"),
  };

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByOffice: jest.fn(),
      findOccupiedOffices: jest.fn(),
      save: jest.fn(),
      updateStatus: jest.fn(),
      updateStatusAndOffice: jest.fn(),
      updateSpecialty: jest.fn(),
    } as jest.Mocked<DoctorRepository>;

    publisher = {
      publishDoctorCheckedIn: jest.fn(),
    };

    officeRepo = {
      findAll: jest.fn(),
      findByNumber: jest.fn(),
      findEnabledNumbers: jest.fn(),
      findMaxNumber: jest.fn(),
      createMany: jest.fn(),
      updateEnabled: jest.fn(),
    } as jest.Mocked<OfficeRepository>;

    service = new DoctorServiceImpl(repo, publisher, officeRepo);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should allow check-in with office 9 when office exists and is enabled", async () => {
    officeRepo.findByNumber.mockResolvedValue({
      number: "9",
      enabled: true,
      createdAt: new Date("2026-04-06T10:00:00.000Z"),
      updatedAt: new Date("2026-04-06T10:00:00.000Z"),
    });
    repo.findById.mockResolvedValue(doctorFixture);
    repo.updateStatusAndOffice.mockResolvedValue({
      ...doctorFixture,
      office: "9",
      status: "available",
    });
    publisher.publishDoctorCheckedIn.mockResolvedValue(undefined);

    const result = await service.checkIn("doc-001", "9");

    expect(result.office).toBe("9");
    expect(repo.updateStatusAndOffice).toHaveBeenCalledWith(
      "doc-001",
      "available",
      "9",
    );
    expect(publisher.publishDoctorCheckedIn).toHaveBeenCalledWith(
      expect.objectContaining({
        doctorId: "doc-001",
        office: "9",
      }),
    );
  });

  it("should reject check-in when office does not exist in catalog", async () => {
    officeRepo.findByNumber.mockResolvedValue(null);

    await expect(service.checkIn("doc-001", "9")).rejects.toThrow(
      BadRequestException,
    );

    expect(repo.findById).not.toHaveBeenCalled();
  });

  it("should reject check-in when office is disabled", async () => {
    officeRepo.findByNumber.mockResolvedValue({
      number: "9",
      enabled: false,
      createdAt: new Date("2026-04-06T10:00:00.000Z"),
      updatedAt: new Date("2026-04-06T10:00:00.000Z"),
    });

    await expect(service.checkIn("doc-001", "9")).rejects.toThrow(
      ConflictException,
    );

    expect(repo.findById).not.toHaveBeenCalled();
  });

  it("should compute available offices from catalog and occupied set", async () => {
    officeRepo.findEnabledNumbers.mockResolvedValue(["10", "2", "1", "9"]);
    repo.findOccupiedOffices.mockResolvedValue(["2", "9"]);

    const result = await service.getAvailableOffices();

    expect(result).toEqual(["1", "10"]);
  });
});
