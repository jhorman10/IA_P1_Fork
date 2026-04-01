import { Test, TestingModule } from "@nestjs/testing";
import { GetQueuePositionUseCaseImpl } from "src/application/use-cases/queue-position.use-case.impl";
import { AppointmentReadRepository } from "src/domain/ports/outbound/appointment-read.repository";

describe("GetQueuePositionUseCaseImpl", () => {
  let useCase: GetQueuePositionUseCaseImpl;
  let mockRepository: jest.Mocked<AppointmentReadRepository>;

  beforeEach(async () => {
    mockRepository = {
      findAll: jest.fn(),
      findByIdCard: jest.fn(),
      findWaiting: jest.fn(),
      findActiveByIdCard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetQueuePositionUseCaseImpl,
        {
          provide: "AppointmentReadRepository",
          useValue: mockRepository,
        },
      ],
    }).compile();

    useCase = module.get<GetQueuePositionUseCaseImpl>(
      GetQueuePositionUseCaseImpl,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return queue position when the appointment exists", async () => {
    mockRepository.findWaiting.mockResolvedValue([
      {
        id: "a-1",
        idCard: 1001,
        fullName: "A",
        office: null,
        status: "waiting",
        priority: "high",
        timestamp: 100,
        doctorId: null,
        doctorName: null,
      },
      {
        id: "a-2",
        idCard: 2002,
        fullName: "B",
        office: null,
        status: "waiting",
        priority: "medium",
        timestamp: 200,
        doctorId: null,
        doctorName: null,
      },
    ]);

    const result = await useCase.execute(2002);

    expect(result).toEqual({
      idCard: 2002,
      position: 2,
      total: 2,
      status: "waiting",
      priority: "medium",
    });
    expect(mockRepository.findWaiting).toHaveBeenCalledTimes(1);
  });

  it("should return not_found when idCard is not in waiting queue", async () => {
    mockRepository.findWaiting.mockResolvedValue([
      {
        id: "a-1",
        idCard: 1001,
        fullName: "A",
        office: null,
        status: "waiting",
        priority: "high",
        timestamp: 100,
        doctorId: null,
        doctorName: null,
      },
    ]);

    const result = await useCase.execute(9999);

    expect(result).toEqual({
      idCard: 9999,
      position: 0,
      total: 1,
      status: "not_found",
      priority: null,
    });
  });

  it("should order queue by priority and FIFO when calculating position", async () => {
    mockRepository.findWaiting.mockResolvedValue([
      {
        id: "m-late",
        idCard: 4444,
        fullName: "Medium Late",
        office: null,
        status: "waiting",
        priority: "medium",
        timestamp: 200,
        doctorId: null,
        doctorName: null,
      },
      {
        id: "h-early",
        idCard: 1111,
        fullName: "High Early",
        office: null,
        status: "waiting",
        priority: "high",
        timestamp: 300,
        doctorId: null,
        doctorName: null,
      },
      {
        id: "m-early",
        idCard: 3333,
        fullName: "Medium Early",
        office: null,
        status: "waiting",
        priority: "medium",
        timestamp: 100,
        doctorId: null,
        doctorName: null,
      },
      {
        id: "l",
        idCard: 5555,
        fullName: "Low",
        office: null,
        status: "waiting",
        priority: "low",
        timestamp: 50,
        doctorId: null,
        doctorName: null,
      },
    ]);

    const result = await useCase.execute(4444);

    expect(result.position).toBe(3);
    expect(result.total).toBe(4);
    expect(result.priority).toBe("medium");
  });
});
