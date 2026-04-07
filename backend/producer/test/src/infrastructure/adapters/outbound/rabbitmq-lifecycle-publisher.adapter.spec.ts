import { Logger } from "@nestjs/common";
import { RabbitMQLifecyclePublisherAdapter } from "src/infrastructure/adapters/outbound/rabbitmq-lifecycle-publisher.adapter";

describe("RabbitMQLifecyclePublisherAdapter", () => {
  let adapter: RabbitMQLifecyclePublisherAdapter;
  const mockClient = { emit: jest.fn() } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new RabbitMQLifecyclePublisherAdapter(mockClient);
  });

  it("should emit complete, cancel and doctor_checked_in events", async () => {
    await expect(adapter.publishCompleteAppointment({ appointmentId: "a1" } as any)).resolves.toBeUndefined();
    expect(mockClient.emit).toHaveBeenCalledWith("complete_appointment", { appointmentId: "a1" });

    await expect(adapter.publishCancelAppointment({ appointmentId: "a2" } as any)).resolves.toBeUndefined();
    expect(mockClient.emit).toHaveBeenCalledWith("cancel_appointment", { appointmentId: "a2" });

    await expect(adapter.publishDoctorCheckedIn({ doctorId: "d1" } as any)).resolves.toBeUndefined();
    expect(mockClient.emit).toHaveBeenCalledWith("doctor_checked_in", { doctorId: "d1" });
  });

  it("should log and rethrow when client.emit throws", async () => {
    const error = new Error("boom");
    mockClient.emit.mockImplementation(() => {
      throw error;
    });
    const spy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    await expect(adapter.publishCompleteAppointment({ appointmentId: "a1" } as any)).rejects.toThrow(error);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log and rethrow for cancel and doctor_checked_in when client.emit throws", async () => {
    const error = new Error("boom2");
    mockClient.emit.mockImplementation(() => {
      throw error;
    });
    const spy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});

    await expect(adapter.publishCancelAppointment({ appointmentId: "a2" } as any)).rejects.toThrow(error);
    await expect(adapter.publishDoctorCheckedIn({ doctorId: "d1" } as any)).rejects.toThrow(error);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
