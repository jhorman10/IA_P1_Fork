// SPEC-006: useClientSideConfig — generic SSR-safe lazy-load hook tests

import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { useClientSideConfig } from "@/lib/useClientSideConfig";

describe("useClientSideConfig", () => {
  it("returns the fallback value before init resolves", () => {
    const init = jest.fn(() => new Promise<string>(() => {})); // never resolves
    const { result } = renderHook(() =>
      useClientSideConfig(init, "fallback-value"),
    );

    expect(result.current).toBe("fallback-value");
  });

  it("returns the resolved value once init completes", async () => {
    const init = jest.fn(() => Promise.resolve("resolved-config"));
    const { result } = renderHook(() =>
      useClientSideConfig(init, "fallback-value"),
    );

    await waitFor(() => {
      expect(result.current).toBe("resolved-config");
    });

    expect(init).toHaveBeenCalledTimes(1);
  });

  it("keeps the fallback when init rejects", async () => {
    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const init = jest.fn(() => Promise.reject(new Error("SDK init failed")));

    const { result } = renderHook(() =>
      useClientSideConfig(init, "fallback-value"),
    );

    // Give the rejected promise time to propagate
    await new Promise<void>((r) => setTimeout(r, 50));

    expect(result.current).toBe("fallback-value");
    consoleError.mockRestore();
  });

  it("keeps fallback and does not call init during server prerender", () => {
    const init = jest.fn(() => Promise.resolve("resolved-config"));

    function SsrProbe() {
      const value = useClientSideConfig(init, "fallback-value");
      return createElement("span", null, value);
    }

    const html = renderToString(createElement(SsrProbe));

    expect(html).toContain("fallback-value");
    expect(init).not.toHaveBeenCalled();
  });

  it("calls init only once even when the component re-renders", async () => {
    const init = jest.fn(() => Promise.resolve("value"));
    const { result, rerender } = renderHook(() =>
      useClientSideConfig(init, "fallback-value"),
    );

    await waitFor(() => expect(result.current).toBe("value"));

    rerender();
    rerender();

    expect(init).toHaveBeenCalledTimes(1);
  });

  it("works with object types as config", async () => {
    const config = { apiKey: "abc123", region: "us-east-1" };
    const init = jest.fn(() => Promise.resolve(config));

    const { result } = renderHook(() =>
      useClientSideConfig(init, { apiKey: "", region: "" }),
    );

    await waitFor(() => {
      expect(result.current).toEqual(config);
    });
  });
});
