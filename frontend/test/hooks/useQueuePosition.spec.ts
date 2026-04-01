/**
 * \ud83e\uddea Tests for useQueuePosition hook (SPEC-003)
 */

import { renderHook, waitFor } from "@testing-library/react";

import { useQueuePosition } from "@/hooks/useQueuePosition";

// Mock the service
jest.mock("@/services/appointmentService", () => ({
  getQueuePosition: jest.fn(),
}));

import { getQueuePosition } from "@/services/appointmentService";

const mockGetQueuePosition = getQueuePosition as jest.MockedFunction<
  typeof getQueuePosition
>;

describe("useQueuePosition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return initial loading state", async () => {
    mockGetQueuePosition.mockResolvedValue({
      idCard: 123456,
      position: 2,
      total: 5,
      status: "waiting",
      priority: "medium",
    });

    const { result } = renderHook(() => useQueuePosition(123456));
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("should return position and total after fetch", async () => {
    mockGetQueuePosition.mockResolvedValue({
      idCard: 123456,
      position: 3,
      total: 7,
      status: "waiting",
      priority: "high",
    });

    const { result } = renderHook(() => useQueuePosition(123456));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetQueuePosition).toHaveBeenCalledWith(123456);
    expect(result.current.position).toBe(3);
    expect(result.current.total).toBe(7);
    expect(result.current.error).toBeNull();
  });

  it("should set error on fetch failure", async () => {
    mockGetQueuePosition.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useQueuePosition(123456));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Error al obtener posición en cola");
    expect(result.current.position).toBeNull();
  });

  it("should not fetch when idCard is null", () => {
    renderHook(() => useQueuePosition(null));
    expect(mockGetQueuePosition).not.toHaveBeenCalled();
  });

  it("should refetch when refreshSignal changes", async () => {
    mockGetQueuePosition.mockResolvedValue({
      idCard: 111111,
      position: 1,
      total: 3,
      status: "waiting",
      priority: "low",
    });

    const { rerender } = renderHook(
      ({ signal }) => useQueuePosition(111111, signal),
      { initialProps: { signal: 0 } },
    );

    await waitFor(() => expect(mockGetQueuePosition).toHaveBeenCalledTimes(1));

    rerender({ signal: 1 });

    await waitFor(() => expect(mockGetQueuePosition).toHaveBeenCalledTimes(2));
  });
});
