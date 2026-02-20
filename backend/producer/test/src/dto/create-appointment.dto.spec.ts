import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { CreateAppointmentDto } from "src/dto/create-appointment.dto";

describe("CreateAppointmentDto - Validation", () => {
  it("should validate correctly a valid CreateAppointmentDto", async () => {
    const validDto = {
      idCard: 123456789,
      fullName: "John Doe",
    };

    const dto = plainToClass(CreateAppointmentDto, validDto);
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("should fail if idCard is missing", async () => {
    const invalidDto = {
      fullName: "John Doe",
    };

    const dto = plainToClass(CreateAppointmentDto, invalidDto);
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("idCard");
    expect(errors[0].constraints).toHaveProperty("isNotEmpty");
  });

  it("should fail if fullName is missing", async () => {
    const invalidDto = {
      idCard: 123456789,
    };

    const dto = plainToClass(CreateAppointmentDto, invalidDto);
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("fullName");
    expect(errors[0].constraints).toHaveProperty("isNotEmpty");
  });

  it("should fail if idCard is not a number", async () => {
    const invalidDto = {
      idCard: "invalid-text",
      fullName: "John Doe",
    };

    const dto = plainToClass(CreateAppointmentDto, invalidDto);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("idCard");
  });

  it("should fail if fullName is not a string", async () => {
    const invalidDto = {
      idCard: 123456789,
      fullName: 12345,
    };

    const dto = plainToClass(CreateAppointmentDto, invalidDto);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("fullName");
  });

  it("should reject negative idCards", async () => {
    const dto = plainToClass(CreateAppointmentDto, {
      idCard: -123456789,
      fullName: "John Doe",
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe("idCard");
  });

  it("should reject idCards greater than MAX_SAFE_INTEGER", async () => {
    const dto = plainToClass(CreateAppointmentDto, {
      idCard: Number.MAX_SAFE_INTEGER + 1,
      fullName: "John Doe",
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe("idCard");
  });
});
