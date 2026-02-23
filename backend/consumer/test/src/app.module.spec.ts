import { Test, TestingModule } from "@nestjs/testing";

import { RmqNotificationAdapter } from "../../src/infrastructure/adapters/rmq-notification.adapter";
import { NotificationsService } from "../../src/notifications/notifications.service";

describe("RmqNotificationAdapter", () => {
  let adapter: RmqNotificationAdapter;
  let mockNotificationsService: jest.Mocked<NotificationsService>;
  let mockClientProxy: { emit: jest.Mock };

  beforeEach(async () => {
    mockNotificationsService = {
      sendNotification: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationsService>;

    mockClientProxy = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RmqNotificationAdapter,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: "APPOINTMENT_NOTIFICATIONS",
          useValue: mockClientProxy,
        },
      ],
    }).compile();

    adapter = module.get<RmqNotificationAdapter>(RmqNotificationAdapter);
  });

  it("should be defined", () => {
    expect(adapter).toBeDefined();
  });

  // HUMAN CHECK: Critical test - ensures both local and global notifications are sent
  it("should send local notification and emit RMQ event on appointment update", async () => {
    const mockAppointment = {
      id: "123",
      fullName: { toValue: () => "John Doe" },
      idCard: { toValue: () => 12345678 },
      office: "1",
      status: "called",
      priority: { toValue: () => "high" },
      timestamp: Date.now(),
      completedAt: null,
    };

    await adapter.notifyAppointmentUpdated(mockAppointment as any);

    expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(
      12345678,
      "1",
    );

    expect(mockClientProxy.emit).toHaveBeenCalledWith(
      "appointment_created",
      expect.objectContaining({
        id: "123",
        fullName: "John Doe",
        idCard: 12345678,
        office: "1",
        status: "called",
        priority: "high",
      }),
    );
  });

  it("should map appointment to payload correctly", async () => {
    const mockAppointment = {
      id: "456",
      fullName: { toValue: () => "Jane Smith" },
      idCard: { toValue: () => 87654321 },
      office: "2",
      status: "waiting",
      priority: { toValue: () => "low" },
      timestamp: 1000,
      completedAt: 2000,
    };

    await adapter.notifyAppointmentUpdated(mockAppointment as any);

    expect(mockClientProxy.emit).toHaveBeenCalledWith("appointment_created", {
      id: "456",
      fullName: "Jane Smith",
      idCard: 87654321,
      office: "2",
      status: "waiting",
      priority: "low",
      timestamp: 1000,
      completedAt: 2000,
    });
  });
});
