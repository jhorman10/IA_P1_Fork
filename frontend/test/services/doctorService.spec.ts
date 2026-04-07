// SPEC-008: doctorService unit tests — error-message preservation
export {};

function mockDoctorFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

function setEnv() {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
}

const fakeDoctor = {
  id: "doc-1",
  name: "Dr. Torres",
  specialty: "General",
  office: "A1",
  status: "offline",
};

describe("doctorService — checkOutDoctor", () => {
  beforeEach(() => {
    jest.resetModules();
    setEnv();
  });

  it("returns doctor on 200", async () => {
    mockDoctorFetch(true, fakeDoctor, 200);
    const { checkOutDoctor } = await import("@/services/doctorService");

    const result = await checkOutDoctor("doc-1", "token");

    expect(result).toEqual(fakeDoctor);
  });

  it("preserves backend message body on non-OK response (CRITERIO-1.4)", async () => {
    const errorBody = {
      message: "Tiene un paciente asignado, no puede salir del consultorio",
    };
    mockDoctorFetch(false, errorBody, 409);
    const { checkOutDoctor } = await import("@/services/doctorService");

    await expect(checkOutDoctor("doc-1", "token")).rejects.toThrow(
      "Tiene un paciente asignado, no puede salir del consultorio",
    );
  });

  it("falls back to HTTP_ERROR string when body has no message", async () => {
    mockDoctorFetch(false, {}, 500);
    const { checkOutDoctor } = await import("@/services/doctorService");

    await expect(checkOutDoctor("doc-1", "token")).rejects.toThrow(
      "HTTP_ERROR: 500",
    );
  });

  it("falls back to HTTP_ERROR string when body parse fails", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockRejectedValue(new SyntaxError("bad json")),
    });
    const { checkOutDoctor } = await import("@/services/doctorService");

    await expect(checkOutDoctor("doc-1", "token")).rejects.toThrow(
      "HTTP_ERROR: 503",
    );
  });
});

describe("doctorService — checkInDoctor", () => {
  beforeEach(() => {
    jest.resetModules();
    setEnv();
  });

  it("returns doctor on 200", async () => {
    mockDoctorFetch(true, fakeDoctor, 200);
    const { checkInDoctor } = await import("@/services/doctorService");

    const result = await checkInDoctor("doc-1", "token", "3");

    expect(result).toEqual(fakeDoctor);
  });

  it("preserves backend message body on non-OK response", async () => {
    const errorBody = { message: "Doctor ya se encuentra en consultorio" };
    mockDoctorFetch(false, errorBody, 409);
    const { checkInDoctor } = await import("@/services/doctorService");

    await expect(checkInDoctor("doc-1", "token", "2")).rejects.toThrow(
      "Doctor ya se encuentra en consultorio",
    );
  });

  it("falls back to HTTP_ERROR string when body has no message", async () => {
    mockDoctorFetch(false, {}, 400);
    const { checkInDoctor } = await import("@/services/doctorService");

    await expect(checkInDoctor("doc-1", "token", "1")).rejects.toThrow(
      "HTTP_ERROR: 400",
    );
  });
});
