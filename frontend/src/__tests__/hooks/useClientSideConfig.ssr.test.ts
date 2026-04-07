import { renderHook } from "@testing-library/react";

import { useClientSideConfig } from "@/lib/useClientSideConfig";

describe("useClientSideConfig SSR branch", () => {
  it("keeps fallback and skips init when window is unavailable", async () => {
    const originalWindow = globalThis.window;

    (globalThis as { window?: Window & typeof globalThis }).window = undefined;

    try {
      const init = jest.fn(() => Promise.resolve("resolved-config"));
      const { result } = renderHook(() =>
        useClientSideConfig(init, "fallback-value"),
      );

      await Promise.resolve();

      expect(init).not.toHaveBeenCalled();
      expect(result.current).toBe("fallback-value");
    } finally {
      (globalThis as { window?: Window & typeof globalThis }).window =
        originalWindow;
    }
  });
});
