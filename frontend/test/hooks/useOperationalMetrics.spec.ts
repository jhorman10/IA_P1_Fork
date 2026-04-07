// SPEC-013: useOperationalMetrics hook unit tests
import { act, renderHook, waitFor } from "@testing-library/react";

import { OperationalMetrics } from "@/domain/OperationalMetrics";
import { useOperationalMetrics } from "@/hooks/useOperationalMetrics";
import { getOperationalMetrics } from "@/services/metricsService";

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/metricsService", () => ({
  getOperationalMetrics: jest.fn(),
}));

import { useAuth } from "@/hooks/useAuth";

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockGetMetrics = getOperationalMetrics as jest.MockedFunction<
  typeof getOperationalMetrics
>;

const sampleMetrics: OperationalMetrics = {
  appointments: { waiting: 5, called: 2, completedToday: 10 },
  doctors: { available: 3, busy: 2, offline: 1 },
  performance: {
    avgWaitTimeMinutes: 8.5,
    avgConsultationTimeMinutes: 12.3,
    throughputPerHour: 4.0,
  },
  generatedAt: "2026-04-05T14:30:00.000Z",
};

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

describe("useOperationalMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseAuth.mockReturnValue(buildAuthReturn());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("loads metrics on mount when token is present", async () => {
    mockGetMetrics.mockResolvedValue(sampleMetrics);

    const { result } = renderHook(() => useOperationalMetrics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetMetrics).toHaveBeenCalledWith("test-token");
    expect(result.current.metrics).toEqual(sampleMetrics);
    expect(result.current.error).toBeNull();
  });

  it("does not fetch when token is null", () => {
    mockUseAuth.mockReturnValue(buildAuthReturn(null));

    renderHook(() => useOperationalMetrics());

    expect(mockGetMetrics).not.toHaveBeenCalled();
  });

  it("sets error state on fetch failure", async () => {
    mockGetMetrics.mockRejectedValue(new Error("HTTP_ERROR: 403"));

    const { result } = renderHook(() => useOperationalMetrics());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("HTTP_ERROR: 403");
    expect(result.current.metrics).toBeNull();
  });

  it("auto-refreshes every 30 seconds", async () => {
    mockGetMetrics.mockResolvedValue(sampleMetrics);

    renderHook(() => useOperationalMetrics());

    await waitFor(() => expect(mockGetMetrics).toHaveBeenCalledTimes(1));

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(mockGetMetrics).toHaveBeenCalledTimes(2));

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(mockGetMetrics).toHaveBeenCalledTimes(3));
  });

  it("clears interval on unmount", async () => {
    mockGetMetrics.mockResolvedValue(sampleMetrics);

    const { unmount } = renderHook(() => useOperationalMetrics());

    await waitFor(() => expect(mockGetMetrics).toHaveBeenCalledTimes(1));

    unmount();

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    // No additional calls after unmount
    expect(mockGetMetrics).toHaveBeenCalledTimes(1);
  });

  it("preserves previous metrics when a refresh fails", async () => {
    mockGetMetrics
      .mockResolvedValueOnce(sampleMetrics)
      .mockRejectedValueOnce(new Error("HTTP_ERROR: 500"));

    const { result } = renderHook(() => useOperationalMetrics());

    await waitFor(() => expect(result.current.metrics).toEqual(sampleMetrics));

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    await waitFor(() => expect(result.current.error).toBe("HTTP_ERROR: 500"));

    // Previous metrics are retained
    expect(result.current.metrics).toEqual(sampleMetrics);
  });

  it("exposes refetch callback that re-fetches on demand", async () => {
    mockGetMetrics.mockResolvedValue(sampleMetrics);

    const { result } = renderHook(() => useOperationalMetrics());

    await waitFor(() => expect(mockGetMetrics).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => expect(mockGetMetrics).toHaveBeenCalledTimes(2));
  });
});
