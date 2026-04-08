// SPEC-011: useAuditLogs hook unit tests
import { act, renderHook, waitFor } from "@testing-library/react";

import { AuditLogEntry, AuditLogPage } from "@/domain/AuditLog";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { getAuditLogs } from "@/services/auditService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/auditService", () => ({
  getAuditLogs: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetAuditLogs = getAuditLogs as jest.MockedFunction<
  typeof getAuditLogs
>;

const sampleEntry: AuditLogEntry = {
  id: "log-1",
  action: "PROFILE_CREATED",
  actorUid: "uid-admin",
  targetUid: "uid-target",
  targetId: null,
  details: { role: "recepcionista" },
  timestamp: 1712345678000,
  createdAt: "2026-04-05T14:21:18.000Z",
};

function buildPage(entries: AuditLogEntry[] = [sampleEntry]): AuditLogPage {
  return {
    data: entries,
    total: entries.length,
    page: 1,
    limit: 5,
    totalPages: 1,
  };
}

function buildAuthReturn(token: string | null = "test-token") {
  return {
    user: null,
    profile: null,
    token,
    loading: false,
    authError: null,
    login: jest.fn(),
    logout: jest.fn(),
  };
}

describe("useAuditLogs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  it("fetches logs on mount when token is present", async () => {
    mockGetAuditLogs.mockResolvedValue(buildPage());

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetAuditLogs).toHaveBeenCalledWith("test-token", {
      page: 1,
      limit: 5,
    });
    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0].id).toBe("log-1");
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when token is null", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn(null));

    renderHook(() => useAuditLogs());

    expect(mockGetAuditLogs).not.toHaveBeenCalled();
  });

  it("sets error state on fetch failure", async () => {
    mockGetAuditLogs.mockRejectedValue(new Error("HTTP_ERROR: 403"));

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("HTTP_ERROR: 403");
    expect(result.current.logs).toHaveLength(0);
  });

  it("re-fetches when filters change via setFilters", async () => {
    mockGetAuditLogs.mockResolvedValue(buildPage());

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetAuditLogs.mockResolvedValue(buildPage([]));

    act(() => {
      result.current.setFilters({ action: "DOCTOR_CHECK_IN" });
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetAuditLogs).toHaveBeenLastCalledWith("test-token", {
      action: "DOCTOR_CHECK_IN",
      page: 1,
      limit: 5,
    });
  });

  it("fetches the requested page via fetchLogs", async () => {
    mockGetAuditLogs.mockResolvedValue({
      ...buildPage(),
      page: 2,
      totalPages: 3,
    });

    const { result } = renderHook(() => useAuditLogs());

    await waitFor(() => expect(result.current.loading).toBe(false));

    mockGetAuditLogs.mockResolvedValue({
      ...buildPage(),
      page: 2,
      totalPages: 3,
    });

    act(() => {
      result.current.fetchLogs(2);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetAuditLogs).toHaveBeenLastCalledWith("test-token", {
      page: 2,
      limit: 5,
    });
  });
});
