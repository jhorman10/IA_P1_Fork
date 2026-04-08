import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { Model } from "mongoose";
import { DoctorServiceImpl } from "src/application/use-cases/doctor.service.impl";
import { DoctorView } from "src/domain/models/doctor-view";
import { AppointmentLifecyclePublisherPort } from "src/domain/ports/outbound/appointment-lifecycle-publisher.port";
import { DoctorRepository } from "src/domain/ports/outbound/doctor.repository";
import { DoctorDocument } from "src/schemas/doctor.schema";

// ── helpers ────────────────────────────────────────────────────────────────

function makeDoctorView(overrides: Partial<DoctorView> = {}): DoctorView {
  return {
    id: "doc-001",
    name: "Dr. Ana Pérez",
    specialty: "Medicina General",
    office: null,
    status: "offline",
    ...overrides,
  };
}

// ── test suite ─────────────────────────────────────────────────────────────

describe("DoctorServiceImpl", () => {
  let service: DoctorServiceImpl;
  let repo: jest.Mocked<DoctorRepository>;
  let lifecyclePublisher: jest.Mocked<AppointmentLifecyclePublisherPort>;
  let doctorModel: {
    find: jest.Mock;
    findOne: jest.Mock;
    db: {
      collection: jest.Mock;
    };
  };

  beforeEach(() => {
    repo = {
      save: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      updateStatusAndOffice: jest.fn(),
      findByOffice: jest.fn(),
      updateSpecialty: jest.fn(),
    } as jest.Mocked<DoctorRepository>;

    lifecyclePublisher = {
      publishDoctorCheckedIn: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AppointmentLifecyclePublisherPort>;

    doctorModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      db: {
        collection: jest.fn(),
      },
    };

    service = new DoctorServiceImpl(
      repo,
      lifecyclePublisher,
      doctorModel as unknown as Model<DoctorDocument>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── checkIn ──────────────────────────────────────────────────────────────

  describe("checkIn", () => {
    it("should update status+office and publish event on successful check-in", async () => {
      const doctorOffline = makeDoctorView({ status: "offline" });
      const doctorAvailable = makeDoctorView({ status: "available", office: "3" });

      repo.findById.mockResolvedValue(doctorOffline);
      repo.updateStatusAndOffice.mockResolvedValue(doctorAvailable);

      // Mock: office exists and is enabled
      const officeCollection = {
        findOne: jest.fn().mockResolvedValue({ number: "3", enabled: true }),
        find: jest.fn(),
      };
      doctorModel.db.collection.mockReturnValue(officeCollection);

      // Mock: no occupant
      doctorModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.checkIn("doc-001", "3");

      expect(result.status).toBe("available");
      expect(result.office).toBe("3");
      expect(repo.updateStatusAndOffice).toHaveBeenCalledWith(
        "doc-001",
        "available",
        "3",
      );
      expect(lifecyclePublisher.publishDoctorCheckedIn).toHaveBeenCalledWith({
        doctorId: "doc-001",
        timestamp: expect.any(Number),
      });
    });

    it("should throw 404 when doctor is not found", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.checkIn("missing-id", "1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw 409 when doctor is already available", async () => {
      repo.findById.mockResolvedValue(makeDoctorView({ status: "available" }));

      await expect(service.checkIn("doc-001", "1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw 400 when office does not exist in catalog", async () => {
      repo.findById.mockResolvedValue(makeDoctorView({ status: "offline" }));

      const officeCollection = {
        findOne: jest.fn().mockResolvedValue(null),
      };
      doctorModel.db.collection.mockReturnValue(officeCollection);

      await expect(service.checkIn("doc-001", "9")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw 409 when office is disabled in catalog", async () => {
      repo.findById.mockResolvedValue(makeDoctorView({ status: "offline" }));

      const officeCollection = {
        findOne: jest
          .fn()
          .mockResolvedValue({ number: "2", enabled: false }),
      };
      doctorModel.db.collection.mockReturnValue(officeCollection);

      await expect(service.checkIn("doc-001", "2")).rejects.toThrow(
        ConflictException,
      );
    });

    it("should throw 409 when office is already occupied by another doctor", async () => {
      repo.findById.mockResolvedValue(makeDoctorView({ status: "offline" }));

      const officeCollection = {
        findOne: jest
          .fn()
          .mockResolvedValue({ number: "1", enabled: true }),
      };
      doctorModel.db.collection.mockReturnValue(officeCollection);

      // occupant found
      doctorModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: "doc-999" }),
      });

      await expect(service.checkIn("doc-001", "1")).rejects.toThrow(
        ConflictException,
      );
      expect(repo.updateStatusAndOffice).not.toHaveBeenCalled();
    });
  });

  // ── checkOut ─────────────────────────────────────────────────────────────

  describe("checkOut", () => {
    it("should set status offline and office null on successful check-out", async () => {
      const doctorAvailable = makeDoctorView({
        status: "available",
        office: "3",
      });
      const doctorOffline = makeDoctorView({ status: "offline", office: null });

      repo.findById.mockResolvedValue(doctorAvailable);
      repo.updateStatusAndOffice.mockResolvedValue(doctorOffline);

      const result = await service.checkOut("doc-001");

      expect(result.status).toBe("offline");
      expect(result.office).toBeNull();
      expect(repo.updateStatusAndOffice).toHaveBeenCalledWith(
        "doc-001",
        "offline",
        null,
      );
    });

    it("should throw 404 when doctor is not found", async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.checkOut("missing-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw 409 when doctor is busy (has assigned patient)", async () => {
      repo.findById.mockResolvedValue(
        makeDoctorView({ status: "busy", office: "2" }),
      );

      await expect(service.checkOut("doc-001")).rejects.toThrow(
        ConflictException,
      );
      expect(repo.updateStatusAndOffice).not.toHaveBeenCalled();
    });
  });

  // ── getAvailableOffices ───────────────────────────────────────────────────

  describe("getAvailableOffices", () => {
    it("should return enabled offices not occupied by active doctors, sorted ascending", async () => {
      const enabledOfficesCursor = {
        toArray: jest
          .fn()
          .mockResolvedValue([
            { number: "1" },
            { number: "3" },
            { number: "5" },
          ]),
      };
      const officeCollection = {
        find: jest.fn().mockReturnValue(enabledOfficesCursor),
      };
      doctorModel.db.collection.mockReturnValue(officeCollection);

      // Doctor occupying office "3"
      doctorModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([{ office: "3" }]),
      });

      const result = await service.getAvailableOffices();

      expect(result).toEqual(["1", "5"]);
    });

    it("should return empty list when all enabled offices are occupied", async () => {
      const enabledOfficesCursor = {
        toArray: jest
          .fn()
          .mockResolvedValue([{ number: "1" }, { number: "2" }]),
      };
      const officeCollection = {
        find: jest.fn().mockReturnValue(enabledOfficesCursor),
      };
      doctorModel.db.collection.mockReturnValue(officeCollection);

      doctorModel.find.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([{ office: "1" }, { office: "2" }]),
      });

      const result = await service.getAvailableOffices();

      expect(result).toEqual([]);
    });

    it("should return empty list when no enabled offices exist", async () => {
      const enabledOfficesCursor = {
        toArray: jest.fn().mockResolvedValue([]),
      };
      const officeCollection = {
        find: jest.fn().mockReturnValue(enabledOfficesCursor),
      };
      doctorModel.db.collection.mockReturnValue(officeCollection);

      const result = await service.getAvailableOffices();

      expect(result).toEqual([]);
    });
  });
});
