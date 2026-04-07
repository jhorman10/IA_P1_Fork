import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MongooseConsumerAuditLogAdapter } from "src/infrastructure/adapters/outbound/mongoose-consumer-audit-log.adapter";
import { ConsumerAuditLogReadModel } from "src/schemas/consumer-audit-log.schema";

describe("MongooseConsumerAuditLogAdapter", () => {
  let adapter: MongooseConsumerAuditLogAdapter;
  let model: { find: jest.Mock };

  beforeEach(async () => {
    model = { find: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MongooseConsumerAuditLogAdapter,
        { provide: getModelToken(ConsumerAuditLogReadModel.name), useValue: model },
      ],
    }).compile();

    adapter = module.get<MongooseConsumerAuditLogAdapter>(MongooseConsumerAuditLogAdapter);
  });

  afterEach(() => jest.clearAllMocks());

  it("should map timing events from audit logs", async () => {
    const docs = [
      { appointmentId: "a1", action: "APPOINTMENT_ASSIGNED", timestamp: 100 },
      { appointmentId: null, action: "APPOINTMENT_COMPLETED", timestamp: 200 },
    ];

    const chain = { lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(docs) };
    model.find.mockReturnValue(chain);

    const res = await adapter.findTimingEvents(["APPOINTMENT_ASSIGNED", "APPOINTMENT_COMPLETED"], 0);
    expect(model.find).toHaveBeenCalled();
    expect(chain.lean).toHaveBeenCalled();
    expect(res[0]).toEqual({ appointmentId: "a1", action: "APPOINTMENT_ASSIGNED", timestamp: 100 });
    expect(res[1].appointmentId).toBeNull();
  });
});
