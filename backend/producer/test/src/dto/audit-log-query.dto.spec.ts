import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AuditLogQueryDto } from "src/dto/audit-log-query.dto";

describe("AuditLogQueryDto", () => {
  it("accepts a valid query payload and transforms numeric fields", async () => {
    const dto = plainToInstance(AuditLogQueryDto, {
      page: "2",
      limit: "30",
      action: "PROFILE_CREATED",
      actorUid: "uid-admin",
      from: "1712300000000",
      to: "1712400000000",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(30);
    expect(dto.from).toBe(1712300000000);
    expect(dto.to).toBe(1712400000000);
  });

  it("rejects invalid action values", async () => {
    const dto = plainToInstance(AuditLogQueryDto, {
      action: "INVALID_ACTION",
    });

    const errors = await validate(dto);
    const actionError = errors.find((e) => e.property === "action");

    expect(actionError).toBeDefined();
    expect(actionError?.constraints).toHaveProperty("isIn");
  });

  it("rejects page lower than 1", async () => {
    const dto = plainToInstance(AuditLogQueryDto, {
      page: "0",
    });

    const errors = await validate(dto);
    const pageError = errors.find((e) => e.property === "page");

    expect(pageError).toBeDefined();
    expect(pageError?.constraints).toHaveProperty("min");
  });

  it("rejects limit greater than 100", async () => {
    const dto = plainToInstance(AuditLogQueryDto, {
      limit: "101",
    });

    const errors = await validate(dto);
    const limitError = errors.find((e) => e.property === "limit");

    expect(limitError).toBeDefined();
    expect(limitError?.constraints).toHaveProperty("max");
  });
});
