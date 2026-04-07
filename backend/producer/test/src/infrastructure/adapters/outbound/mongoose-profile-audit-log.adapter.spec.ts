import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseProfileAuditLogAdapter } from "src/infrastructure/adapters/outbound/mongoose-profile-audit-log.adapter";
import { ProfileAuditLog } from "src/schemas/profile-audit-log.schema";

describe("MongooseProfileAuditLogAdapter", () => {
  let adapter: MongooseProfileAuditLogAdapter;
  let model: {
    create: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseProfileAuditLogAdapter,
        {
          provide: getModelToken(ProfileAuditLog.name),
          useValue: model,
        },
      ],
    }).compile();

    adapter = module.get<MongooseProfileAuditLogAdapter>(
      MongooseProfileAuditLogAdapter,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("persists profile audit entry and defaults reason to null when omitted", async () => {
    model.create.mockResolvedValue(undefined);

    await adapter.log({
      profileUid: "uid-profile",
      changedBy: "uid-admin",
      before: {
        role: "recepcionista",
        status: "active",
        doctor_id: null,
      },
      after: {
        role: "doctor",
        status: "active",
        doctor_id: "doctor-1",
      },
      timestamp: 1712345678000,
    });

    expect(model.create).toHaveBeenCalledWith({
      profileUid: "uid-profile",
      changedBy: "uid-admin",
      before: {
        role: "recepcionista",
        status: "active",
        doctor_id: null,
      },
      after: {
        role: "doctor",
        status: "active",
        doctor_id: "doctor-1",
      },
      reason: null,
      timestamp: 1712345678000,
    });
  });

  it("persists provided reason without modification", async () => {
    model.create.mockResolvedValue(undefined);

    await adapter.log({
      profileUid: "uid-profile",
      changedBy: "uid-admin",
      before: {
        role: "doctor",
        status: "active",
        doctor_id: "doctor-1",
      },
      after: {
        role: "doctor",
        status: "inactive",
        doctor_id: "doctor-1",
      },
      reason: "Suspension temporal",
      timestamp: 1712345679000,
    });

    expect(model.create).toHaveBeenCalledWith({
      profileUid: "uid-profile",
      changedBy: "uid-admin",
      before: {
        role: "doctor",
        status: "active",
        doctor_id: "doctor-1",
      },
      after: {
        role: "doctor",
        status: "inactive",
        doctor_id: "doctor-1",
      },
      reason: "Suspension temporal",
      timestamp: 1712345679000,
    });
  });
});
