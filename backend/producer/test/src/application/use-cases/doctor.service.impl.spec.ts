import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { DoctorServiceImpl } from "src/application/use-cases/doctor.service.impl";
import { DoctorView } from "src/domain/models/doctor-view";
import { AppointmentLifecyclePublisherPort } from "src/domain/ports/outbound/appointment-lifecycle-publisher.port";
import { DoctorRepository } from "src/domain/ports/outbound/doctor.repository";

describe("DoctorServiceImpl (unit)", () => {
  let service: DoctorServiceImpl;
  let repo: jest.Mocked<DoctorRepository>;
  let lifecyclePublisher: jest.Mocked<AppointmentLifecyclePublisherPort>;

  const sampleDoctor: DoctorView = {
    id: "doc-001",
    name: "Dr. Ana Perez",
    specialty: "Medicina General",
    office: "3",
    status: "offline",
    createdAt: new Date("2026-04-01T10:00:00.000Z"),
    updatedAt: new Date("2026-04-01T10:00:00.000Z"),
  };

  beforeEach(() => {
    repo = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByOffice: jest.fn(),
      updateStatus: jest.fn(),
      updateSpecialty: jest.fn(),
    } as unknown as jest.Mocked<DoctorRepository>;

    lifecyclePublisher = {
      publishCompleteAppointment: jest.fn(),
      publishCancelAppointment: jest.fn(),
      publishDoctorCheckedIn: jest.fn(),
    } as unknown as jest.Mocked<AppointmentLifecyclePublisherPort>;

    service = new DoctorServiceImpl(repo, lifecyclePublisher);
  });

  afterEach(() => jest.clearAllMocks());

  it("should throw BadRequestException for invalid office on create", async () => {
    await expect(
      service.createDoctor({ name: "X", specialty: "S", office: "6" }),
    ).rejects.toThrow(BadRequestException);
    expect(repo.findByOffice).not.toHaveBeenCalled();
  });

  it("should throw ConflictException when office already has a doctor", async () => {
    repo.findByOffice.mockResolvedValue(sampleDoctor);

    await expect(
      service.createDoctor({ name: "X", specialty: "S", office: "3" }),
    ).rejects.toThrow(ConflictException);
    expect(repo.findByOffice).toHaveBeenCalledWith("3");
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("should save and return created doctor when office free", async () => {
    repo.findByOffice.mockResolvedValue(null);
    repo.save.mockResolvedValue(sampleDoctor);

    const result = await service.createDoctor({
      name: sampleDoctor.name,
      specialty: sampleDoctor.specialty,
      office: sampleDoctor.office,
    });

    expect(result).toEqual(sampleDoctor);
    expect(repo.save).toHaveBeenCalledWith({
      name: sampleDoctor.name,
      specialty: sampleDoctor.specialty,
      office: sampleDoctor.office,
    });
  });

  it("should find all doctors optionally filtered by status", async () => {
    repo.findAll.mockResolvedValue([sampleDoctor]);

    const resAll = await service.findAll();
    expect(resAll).toEqual([sampleDoctor]);
    expect(repo.findAll).toHaveBeenCalledWith(undefined);

    await service.findAll("available");
    expect(repo.findAll).toHaveBeenCalledWith("available");
  });

  it("should throw NotFoundException when findById missing", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.findById("unknown")).rejects.toThrow(NotFoundException);
  });

  it("should return doctor when findById present", async () => {
    repo.findById.mockResolvedValue(sampleDoctor);
    const res = await service.findById(sampleDoctor.id);
    expect(res).toEqual(sampleDoctor);
  });

  it("checkIn: throws if doctor not found", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.checkIn("doc-404")).rejects.toThrow(NotFoundException);
  });

  it("checkIn: throws if already available", async () => {
    repo.findById.mockResolvedValue({ ...sampleDoctor, status: "available" });
    await expect(service.checkIn(sampleDoctor.id)).rejects.toThrow(ConflictException);
  });

  it("checkIn: updates status and publishes event", async () => {
    repo.findById.mockResolvedValue({ ...sampleDoctor, status: "busy" });
    const updated: DoctorView = { ...sampleDoctor, status: "available" };
    repo.updateStatus.mockResolvedValue(updated);

    const res = await service.checkIn(sampleDoctor.id);
    expect(res).toEqual(updated);
    expect(repo.updateStatus).toHaveBeenCalledWith(sampleDoctor.id, "available");
    expect(lifecyclePublisher.publishDoctorCheckedIn).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: sampleDoctor.id, timestamp: expect.any(Number) }),
    );
  });

  it("checkOut: throws if doctor not found", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.checkOut("doc-404")).rejects.toThrow(NotFoundException);
  });

  it("checkOut: throws if doctor is busy", async () => {
    repo.findById.mockResolvedValue({ ...sampleDoctor, status: "busy" });
    await expect(service.checkOut(sampleDoctor.id)).rejects.toThrow(ConflictException);
  });

  it("checkOut: updates status to offline", async () => {
    repo.findById.mockResolvedValue({ ...sampleDoctor, status: "available" });
    const updated: DoctorView = { ...sampleDoctor, status: "offline" };
    repo.updateStatus.mockResolvedValue(updated);

    const res = await service.checkOut(sampleDoctor.id);
    expect(res).toEqual(updated);
    expect(repo.updateStatus).toHaveBeenCalledWith(sampleDoctor.id, "offline");
  });

  it("updateSpecialty: throws when doctor not found", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.updateSpecialty("doc-404", "Cardiologia")).rejects.toThrow(NotFoundException);
  });

  it("updateSpecialty: calls repo.updateSpecialty when doctor exists", async () => {
    repo.findById.mockResolvedValue(sampleDoctor);
    repo.updateSpecialty.mockResolvedValue();

    await service.updateSpecialty(sampleDoctor.id, "Cardiologia", "spec-1");
    expect(repo.updateSpecialty).toHaveBeenCalledWith(sampleDoctor.id, "Cardiologia");
  });
});
