"use client";

// SPEC-006: useClientSideConfig — generic SSR-safe hook for lazy-loading
// client-side SDK configurations.
//
// The `init` factory is only invoked inside a browser context
// (typeof window !== 'undefined'), so importing this hook never triggers
// Node.js-incompatible SDK code during SSR or Jest/jsdom runs.
import { useEffect, useState } from "react";

/**
 * Lazy-loads a client-side SDK or config value.
 *
 * @param init     Async factory that initialises the SDK/config.
 *                 Called once on mount, only in the browser.
 * @param fallback Value returned during SSR and while `init` is pending.
 * @returns        The resolved config value, or `fallback` until it resolves.
 */
export function useClientSideConfig<T>(init: () => Promise<T>, fallback: T): T {
  const [config, setConfig] = useState<T>(fallback);

  useEffect(() => {
    if (typeof window !== "undefined") {
      init()
        .then(setConfig)
        .catch(() => {
          // Swallow init errors — caller's fallback remains active.
        });
    }
    // `init` is intentionally excluded: the factory must be stable or wrapped
    // in useCallback by the caller. Re-running on every render would re-init SDKs.
  }, []);

  return config;
}
