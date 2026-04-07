// SPEC-016: officeService tests
function mockOfficeFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

function setOfficeBaseEnv() {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
}

describe("officeService", () => {
  beforeEach(() => {
    jest.resetModules();
    setOfficeBaseEnv();
  });

  it("maps GET /offices response to the frontend office shape", async () => {
    mockOfficeFetch(true, [
      {
        number: "5",
        enabled: true,
        occupied: true,
        occupiedByDoctorId: "doc-5",
        occupiedByDoctorName: "Dr. Garcia",
        occupiedByStatus: "available",
        canDisable: false,
        createdAt: "2026-04-07T10:00:00.000Z",
        updatedAt: "2026-04-07T10:05:00.000Z",
      },
    ]);
    const { getOffices } = await import("@/services/officeService");

    const result = await getOffices("admin-token");

    expect(result).toEqual([
      {
        number: "5",
        enabled: true,
        occupied: true,
        occupied_by_doctor_id: "doc-5",
        occupied_by_doctor_name: "Dr. Garcia",
        occupied_by_status: "available",
        can_disable: false,
        created_at: "2026-04-07T10:00:00.000Z",
        updated_at: "2026-04-07T10:05:00.000Z",
      },
    ]);
  });

  it("maps PATCH /offices/:number response to the frontend office shape", async () => {
    mockOfficeFetch(true, {
      number: "2",
      enabled: false,
      occupied: false,
      occupiedByDoctorId: null,
      occupiedByDoctorName: null,
      occupiedByStatus: null,
      canDisable: false,
      createdAt: "2026-04-07T10:00:00.000Z",
      updatedAt: "2026-04-07T11:00:00.000Z",
    });
    const { updateOfficeEnabled } = await import("@/services/officeService");

    const result = await updateOfficeEnabled(
      "2",
      { enabled: false },
      "admin-token",
    );

    const fetchMock = (global as any).fetch as jest.Mock;
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("/offices/2");
    expect(options.method).toBe("PATCH");
    expect(result).toEqual({
      number: "2",
      enabled: false,
      occupied: false,
      occupied_by_doctor_id: null,
      occupied_by_doctor_name: null,
      occupied_by_status: null,
      can_disable: false,
      created_at: "2026-04-07T10:00:00.000Z",
      updated_at: "2026-04-07T11:00:00.000Z",
    });
  });
});
