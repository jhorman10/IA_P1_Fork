import { AppointmentFactory } from "../../../../src/domain/factories/appointment.factory";
import { IdCard } from "../../../../src/domain/value-objects/id-card.value-object";
import { Priority } from "../../../../src/domain/value-objects/priority.value-object";
import { FullName } from "../../../../src/domain/value-objects/full-name.value-object";

describe("AppointmentFactory", () => {
  it("should create a new appointment with default waiting status", () => {
    const idCard = new IdCard(123456789);
    const fullName = new FullName("John Doe");
    const now = Date.now();

    const appointment = AppointmentFactory.createNew(idCard, fullName, now);

    expect(appointment.idCard.equals(idCard)).toBe(true);
    expect(appointment.fullName.toValue()).toBe("John Doe");
    expect(appointment.status).toBe("waiting");
    expect(appointment.priority.toValue()).toBe("medium"); // Default priority
    expect(appointment.timestamp).toBe(now);
  });

  it("should allow creating with explicit priority", () => {
    const idCard = new IdCard(987654321);
    const fullName = new FullName("Jane Doe");
    const priority = new Priority("high");
    const now = Date.now();
    const appointment = AppointmentFactory.createWithPriority(
      idCard,
      fullName,
      priority,
      now,
    );

    expect(appointment.priority.toValue()).toBe("high");
    expect(appointment.fullName.toValue()).toBe("Jane Doe");
    expect(appointment.timestamp).toBe(now);
  });
});
