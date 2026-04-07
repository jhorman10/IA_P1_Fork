import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";

import { MongooseOperationalAuditAdapter } from "src/infrastructure/adapters/outbound/mongoose-operational-audit.adapter";
import { OperationalAuditLog } from "src/schemas/operational-audit-log.schema";

describe("MongooseOperationalAuditAdapter", () => {
  let adapter: MongooseOperationalAuditAdapter;
  let model: {
    create: jest.Mock;
    countDocuments: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseOperationalAuditAdapter,
        {
          provide: getModelToken(OperationalAuditLog.name),
          useValue: model,
        },
      ],
    }).compile();

    adapter = module.get<MongooseOperationalAuditAdapter>(
      MongooseOperationalAuditAdapter,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it("persists audit entry and defaults missing targets to null", async () => {
    model.create.mockResolvedValue(undefined);

    await adapter.log({
      action: "PROFILE_CREATED",
      actorUid: "uid-admin",
      details: { role: "doctor" },
      timestamp: 1712345678000,
    });

    expect(model.create).toHaveBeenCalledWith({
      action: "PROFILE_CREATED",
      actorUid: "uid-admin",
      targetUid: null,
      targetId: null,
      details: { role: "doctor" },
      timestamp: 1712345678000,
    });
  });

  it("returns true when hasRecentEntry finds at least one record", async () => {
    const countExec = jest.fn().mockResolvedValue(1);
    model.countDocuments.mockReturnValue({ exec: countExec });

    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(200_000);

    const result = await adapter.hasRecentEntry(
      "uid-admin",
      "SESSION_RESOLVED",
      10_000,
    );

    expect(result).toBe(true);
    expect(model.countDocuments).toHaveBeenCalledWith({
      actorUid: "uid-admin",
      action: "SESSION_RESOLVED",
      timestamp: { $gte: 190_000 },
    });
    expect(countExec).toHaveBeenCalled();

    nowSpy.mockRestore();
  });

  it("returns false when hasRecentEntry finds no records", async () => {
    model.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(0),
    });

    const result = await adapter.hasRecentEntry(
      "uid-admin",
      "SESSION_RESOLVED",
      10_000,
    );

    expect(result).toBe(false);
  });

  it("returns paginated data applying filters and safe page/limit bounds", async () => {
    const createdAt1 = new Date("2026-04-05T10:00:00.000Z");
    const createdAt2 = new Date("2026-04-05T09:59:59.000Z");

    const findExec = jest.fn().mockResolvedValue([
      {
        _id: { toString: () => "doc-id-1" },
        createdAt: createdAt1,
        action: "PROFILE_CREATED",
        actorUid: "uid-admin",
        targetUid: "uid-new",
        targetId: null,
        details: { role: "doctor" },
        timestamp: 1712345678000,
      },
      {
        _id: { toString: () => "doc-id-2" },
        createdAt: createdAt2,
        action: "DOCTOR_CHECK_IN",
        actorUid: "uid-admin",
        targetUid: null,
        targetId: "doctor-1",
        details: { office: "3" },
        timestamp: 1712345677000,
      },
    ]);

    const findChain = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: findExec,
    };
    model.find.mockReturnValue(findChain);

    const countExec = jest.fn().mockResolvedValue(2);
    model.countDocuments.mockReturnValue({ exec: countExec });

    const result = await adapter.findPaginated(
      {
        action: "PROFILE_CREATED",
        actorUid: "uid-admin",
        from: 1712300000000,
        to: 1712400000000,
      },
      0,
      999,
    );

    expect(model.find).toHaveBeenCalledWith({
      action: "PROFILE_CREATED",
      actorUid: "uid-admin",
      timestamp: {
        $gte: 1712300000000,
        $lte: 1712400000000,
      },
    });
    expect(findChain.sort).toHaveBeenCalledWith({ timestamp: -1 });
    expect(findChain.skip).toHaveBeenCalledWith(0);
    expect(findChain.limit).toHaveBeenCalledWith(100);
    expect(model.countDocuments).toHaveBeenCalledWith({
      action: "PROFILE_CREATED",
      actorUid: "uid-admin",
      timestamp: {
        $gte: 1712300000000,
        $lte: 1712400000000,
      },
    });

    expect(result).toEqual({
      data: [
        {
          id: "doc-id-1",
          createdAt: createdAt1,
          action: "PROFILE_CREATED",
          actorUid: "uid-admin",
          targetUid: "uid-new",
          targetId: null,
          details: { role: "doctor" },
          timestamp: 1712345678000,
        },
        {
          id: "doc-id-2",
          createdAt: createdAt2,
          action: "DOCTOR_CHECK_IN",
          actorUid: "uid-admin",
          targetUid: null,
          targetId: "doctor-1",
          details: { office: "3" },
          timestamp: 1712345677000,
        },
      ],
      total: 2,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
    expect(countExec).toHaveBeenCalled();
    expect(findExec).toHaveBeenCalled();
  });
});
