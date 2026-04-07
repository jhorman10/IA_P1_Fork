// SPEC-013: metricsService tests
function mockMetricsFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

function setMetricsBaseEnv() {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
}

const fakeMetrics = {
  appointments: { waiting: 5, called: 2, completedToday: 10 },
  doctors: { available: 3, busy: 2, offline: 1 },
  performance: {
    avgWaitTimeMinutes: 8.5,
    avgConsultationTimeMinutes: 12.3,
    throughputPerHour: 4.0,
  },
  generatedAt: "2026-04-05T14:30:00.000Z",
};

describe("metricsService — getOperationalMetrics", () => {
  beforeEach(() => {
    jest.resetModules();
    setMetricsBaseEnv();
  });

  it("fetches GET /metrics with auth header and returns data", async () => {
    mockMetricsFetch(true, fakeMetrics);
    const { getOperationalMetrics } = await import("@/services/metricsService");

    const result = await getOperationalMetrics("test-token");

    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/metrics");
    expect(opts.headers.Authorization).toBe("Bearer test-token");
    expect(result).toEqual(fakeMetrics);
  });

  it("throws on 401 response", async () => {
    mockMetricsFetch(false, {}, 401);
    const { getOperationalMetrics } = await import("@/services/metricsService");

    await expect(getOperationalMetrics("bad-token")).rejects.toThrow(
      "HTTP_ERROR: 401",
    );
  });

  it("throws on 403 response", async () => {
    mockMetricsFetch(false, {}, 403);
    const { getOperationalMetrics } = await import("@/services/metricsService");

    await expect(getOperationalMetrics("non-admin-token")).rejects.toThrow(
      "HTTP_ERROR: 403",
    );
  });

  it("throws on 500 response", async () => {
    mockMetricsFetch(false, {}, 500);
    const { getOperationalMetrics } = await import("@/services/metricsService");

    await expect(getOperationalMetrics("tok")).rejects.toThrow(
      "HTTP_ERROR: 500",
    );
  });
});
