// SPEC-012: appointmentService unit tests — completeAppointment, cancelAppointment
export {};

function mockFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

function mockFetchJsonThrows(status: number) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    json: jest.fn().mockRejectedValue(new Error("not JSON")),
  });
}

function setEnv() {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
}

describe("appointmentService — completeAppointment", () => {
  beforeEach(() => {
    jest.resetModules();
    setEnv();
  });

  it("calls PATCH /appointments/:id/complete with Bearer token and returns body on 200", async () => {
    const responseBody = {
      status: "accepted",
      message: "Turno marcado como completado",
    };
    mockFetch(true, responseBody, 200);
    const { completeAppointment } =
      await import("@/services/appointmentService");

    const result = await completeAppointment("apt-001", "my-token");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/appointments/apt-001/complete",
      expect.objectContaining({
        method: "PATCH",
        headers: { Authorization: "Bearer my-token" },
      }),
    );
    expect(result).toEqual(responseBody);
  });

  it("throws HTTP_ERROR on non-OK response", async () => {
    mockFetch(false, {}, 409);
    const { completeAppointment } =
      await import("@/services/appointmentService");

    await expect(completeAppointment("apt-002", "token")).rejects.toThrow(
      "HTTP_ERROR: 409",
    );
  });

  it("throws HTTP_ERROR on 404", async () => {
    mockFetch(false, {}, 404);
    const { completeAppointment } =
      await import("@/services/appointmentService");

    await expect(completeAppointment("nonexistent", "token")).rejects.toThrow(
      "HTTP_ERROR: 404",
    );
  });

  it("throws HTTP_ERROR on 403 (ownership violation)", async () => {
    mockFetch(false, {}, 403);
    const { completeAppointment } =
      await import("@/services/appointmentService");

    await expect(completeAppointment("apt-003", "token")).rejects.toThrow(
      "HTTP_ERROR: 403",
    );
  });

  // SPEC-012: backend message preservation
  it("preserves backend error message when body contains message field", async () => {
    mockFetch(
      false,
      { message: "Solo turnos en atención (called) pueden completarse" },
      409,
    );
    const { completeAppointment } =
      await import("@/services/appointmentService");

    await expect(completeAppointment("apt-004", "token")).rejects.toThrow(
      "Solo turnos en atención (called) pueden completarse",
    );
  });

  it("falls back to HTTP_ERROR when backend body has no message", async () => {
    mockFetch(false, { error: "some other shape" }, 409);
    const { completeAppointment } =
      await import("@/services/appointmentService");

    await expect(completeAppointment("apt-005", "token")).rejects.toThrow(
      "HTTP_ERROR: 409",
    );
  });

  it("falls back to HTTP_ERROR when backend body is not JSON", async () => {
    mockFetchJsonThrows(500);
    const { completeAppointment } =
      await import("@/services/appointmentService");

    await expect(completeAppointment("apt-006", "token")).rejects.toThrow(
      "HTTP_ERROR: 500",
    );
  });
});

describe("appointmentService — cancelAppointment", () => {
  beforeEach(() => {
    jest.resetModules();
    setEnv();
  });

  it("calls PATCH /appointments/:id/cancel with Bearer token and returns body on 200", async () => {
    const responseBody = { status: "accepted", message: "Turno cancelado" };
    mockFetch(true, responseBody, 200);
    const { cancelAppointment } = await import("@/services/appointmentService");

    const result = await cancelAppointment("apt-010", "my-token");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://api.test/appointments/apt-010/cancel",
      expect.objectContaining({
        method: "PATCH",
        headers: { Authorization: "Bearer my-token" },
      }),
    );
    expect(result).toEqual(responseBody);
  });

  it("throws HTTP_ERROR on non-OK response (409 — not waiting)", async () => {
    mockFetch(false, {}, 409);
    const { cancelAppointment } = await import("@/services/appointmentService");

    await expect(cancelAppointment("apt-011", "token")).rejects.toThrow(
      "HTTP_ERROR: 409",
    );
  });

  it("throws HTTP_ERROR on 403 (doctor role not allowed)", async () => {
    mockFetch(false, {}, 403);
    const { cancelAppointment } = await import("@/services/appointmentService");

    await expect(cancelAppointment("apt-012", "token")).rejects.toThrow(
      "HTTP_ERROR: 403",
    );
  });

  it("throws HTTP_ERROR on 404 (appointment not found)", async () => {
    mockFetch(false, {}, 404);
    const { cancelAppointment } = await import("@/services/appointmentService");

    await expect(cancelAppointment("fake-id", "token")).rejects.toThrow(
      "HTTP_ERROR: 404",
    );
  });

  // SPEC-012: backend message preservation
  it("preserves backend error message when body contains message field", async () => {
    mockFetch(
      false,
      { message: "Solo turnos en espera (waiting) pueden cancelarse" },
      409,
    );
    const { cancelAppointment } = await import("@/services/appointmentService");

    await expect(cancelAppointment("apt-013", "token")).rejects.toThrow(
      "Solo turnos en espera (waiting) pueden cancelarse",
    );
  });

  it("falls back to HTTP_ERROR when backend body has no message", async () => {
    mockFetch(false, { error: "some other shape" }, 409);
    const { cancelAppointment } = await import("@/services/appointmentService");

    await expect(cancelAppointment("apt-014", "token")).rejects.toThrow(
      "HTTP_ERROR: 409",
    );
  });

  it("falls back to HTTP_ERROR when backend body is not JSON", async () => {
    mockFetchJsonThrows(500);
    const { cancelAppointment } = await import("@/services/appointmentService");

    await expect(cancelAppointment("apt-015", "token")).rejects.toThrow(
      "HTTP_ERROR: 500",
    );
  });
});
