// Ensure env vars used by the hook are available during import
process.env.NEXT_PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://api.test";
process.env.NEXT_PUBLIC_POLLING_INTERVAL =
  process.env.NEXT_PUBLIC_POLLING_INTERVAL || "1000";

import { act, renderHook, waitFor } from "@testing-library/react";

import { useQueuePosition } from "@/hooks/useQueuePosition";

describe("useQueuePosition hook", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("fetches queue position and updates state periodically", async () => {
    const mockResponse = { position: 3, appointmentId: "apt-1" };

    // Mock global.fetch
    // @ts-expect-error -- jest mock
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(mockResponse) }),
    );

    const { result } = renderHook(() => useQueuePosition(123456));

    // Allow effect to run
    await act(async () => {
      // advance timers so polling runs at least once
      jest.advanceTimersByTime(
        Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL) + 10,
      );
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/appointments/queue-position/123456`,
      );
      expect(result.current.position).toBe(3);
    });
  });
});
