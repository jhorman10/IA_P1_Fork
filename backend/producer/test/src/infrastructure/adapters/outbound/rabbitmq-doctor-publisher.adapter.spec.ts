import { Logger } from "@nestjs/common";
import { RabbitMQDoctorPublisherAdapter } from "src/infrastructure/adapters/outbound/rabbitmq-doctor-publisher.adapter";

describe("RabbitMQDoctorPublisherAdapter", () => {
  let adapter: RabbitMQDoctorPublisherAdapter;
  const mockClient = { emit: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new RabbitMQDoctorPublisherAdapter(mockClient);
  });

  it("should emit doctor_checked_in event", async () => {
    const ev = { doctorId: "d1", office: "1" } as any;
    await expect(adapter.publishDoctorCheckedIn(ev)).resolves.toBeUndefined();
    expect(mockClient.emit).toHaveBeenCalledWith("doctor_checked_in", ev);
  });

  it("should log and rethrow when client.emit throws", async () => {
    const error = new Error("boom");
    mockClient.emit.mockImplementation(() => {
      throw error;
    });
    const spy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    await expect(adapter.publishDoctorCheckedIn({ doctorId: "d2" } as any)).rejects.toThrow(error);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
