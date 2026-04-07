/** @jest-environment node */

describe("useClientSideConfig SSR guard", () => {
  afterEach(() => {
    jest.resetModules();
    jest.unmock("react");
  });

  it("keeps fallback and skips init when window is unavailable", () => {
    jest.isolateModules(() => {
      const actualReact = jest.requireActual("react");

      jest.doMock("react", () => ({
        ...actualReact,
        useEffect: (effect: () => void) => {
          effect();
        },
      }));

      const { createElement } = require("react");
      const { renderToString } = require("react-dom/server");
      const { useClientSideConfig } = require("@/lib/useClientSideConfig");

      const init = jest.fn(() => Promise.resolve("resolved-config"));

      function SsrProbe() {
        const value = useClientSideConfig(init, "fallback-value");
        return createElement("span", null, value);
      }

      const html = renderToString(createElement(SsrProbe));

      expect(html).toContain("fallback-value");
      expect(init).not.toHaveBeenCalled();
    });
  });
});
