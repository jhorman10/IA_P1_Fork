// SPEC-011: auditService tests
function mockAuditFetch(ok: boolean, body: unknown, status = ok ? 200 : 500) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

function setAuditBaseEnv() {
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://api.test";
  process.env.NEXT_PUBLIC_WS_URL = "ws://ws.test";
}

const fakePage = {
  data: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

describe("auditService — getAuditLogs", () => {
  beforeEach(() => {
    jest.resetModules();
    setAuditBaseEnv();
  });

  it("calls GET /audit-logs with auth header and returns data", async () => {
    mockAuditFetch(true, fakePage);
    const { getAuditLogs } = await import("@/services/auditService");

    const result = await getAuditLogs("test-token");

    const fetchMock = (global as any).fetch as jest.Mock;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/audit-logs");
    expect(opts.headers.Authorization).toBe("Bearer test-token");
    expect(result).toEqual(fakePage);
  });

  it("appends action filter to query string", async () => {
    mockAuditFetch(true, fakePage);
    const { getAuditLogs } = await import("@/services/auditService");

    await getAuditLogs("tok", { action: "PROFILE_CREATED" });

    const fetchMock = (global as any).fetch as jest.Mock;
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("action=PROFILE_CREATED");
  });

  it("appends actorUid filter to query string", async () => {
    mockAuditFetch(true, fakePage);
    const { getAuditLogs } = await import("@/services/auditService");

    await getAuditLogs("tok", { actorUid: "uid-abc" });

    const fetchMock = (global as any).fetch as jest.Mock;
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("actorUid=uid-abc");
  });

  it("appends from/to epoch filters", async () => {
    mockAuditFetch(true, fakePage);
    const { getAuditLogs } = await import("@/services/auditService");

    await getAuditLogs("tok", { from: 1000000, to: 2000000 });

    const fetchMock = (global as any).fetch as jest.Mock;
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("from=1000000");
    expect(url).toContain("to=2000000");
  });

  it("appends pagination params", async () => {
    mockAuditFetch(true, fakePage);
    const { getAuditLogs } = await import("@/services/auditService");

    await getAuditLogs("tok", { page: 2, limit: 10 });

    const fetchMock = (global as any).fetch as jest.Mock;
    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("page=2");
    expect(url).toContain("limit=10");
  });

  it("throws on non-ok response", async () => {
    mockAuditFetch(false, {}, 403);
    const { getAuditLogs } = await import("@/services/auditService");

    await expect(getAuditLogs("tok")).rejects.toThrow("HTTP_ERROR: 403");
  });
});
