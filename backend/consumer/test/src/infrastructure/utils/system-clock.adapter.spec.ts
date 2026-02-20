/**
 * 🧪 Tests for SystemClockAdapter
 *
 * Tests system time adaptation for domain clock port
 */

import { SystemClockAdapter } from "../../../../src/infrastructure/utils/system-clock.adapter";

describe("SystemClockAdapter", () => {
  let adapter: SystemClockAdapter;

  beforeEach(() => {
    adapter = new SystemClockAdapter();
  });

  describe("now()", () => {
    it("should return current timestamp in milliseconds", () => {
      const beforeTime = Date.now();
      const result = adapter.now();
      const afterTime = Date.now();

      expect(result).toBeGreaterThanOrEqual(beforeTime);
      expect(result).toBeLessThanOrEqual(afterTime);
    });

    it("should return milliseconds (not seconds)", () => {
      const now = adapter.now();

      // Timestamps in milliseconds should be large (> 10^12)
      expect(now).toBeGreaterThan(1000000000000); // September 9, 2001

      // Timestamps in seconds would be smaller
      expect(now).toBeGreaterThan(1700000000); // Current epoch in seconds
    });

    it("should return number type", () => {
      const result = adapter.now();
      expect(typeof result).toBe("number");
    });

    it("should return positive number", () => {
      const result = adapter.now();
      expect(result).toBeGreaterThan(0);
    });

    it("should return integer (no decimal places)", () => {
      const result = adapter.now();
      expect(Number.isInteger(result)).toBe(true);
    });

    it("should be consistent with Date.now()", () => {
      const dateNow = Date.now();
      const adapterNow = adapter.now();

      // Should be within 10ms of each other
      expect(Math.abs(adapterNow - dateNow)).toBeLessThan(10);
    });

    it("should increase over multiple calls", (done) => {
      const time1 = adapter.now();

      // Wait 10ms to ensure measurable difference
      setTimeout(() => {
        const time2 = adapter.now();
        expect(time2).toBeGreaterThan(time1);
        done();
      }, 10);
    });

    it("should handle rapid consecutive calls", () => {
      const times = [];
      for (let i = 0; i < 100; i++) {
        times.push(adapter.now());
      }

      // All should be valid timestamps
      times.forEach((time) => {
        expect(time).toBeGreaterThan(0);
        expect(Number.isInteger(time)).toBe(true);
      });

      // Should be monotonically increasing or equal
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });

    it("should handle epoch boundary values", () => {
      const now = adapter.now();

      // Should be after Unix epoch start
      expect(now).toBeGreaterThan(0);

      // Should be before year 2100 (rough upper bound for testing)
      const year2100 = 4102444800000; // January 1, 2100 in milliseconds
      expect(now).toBeLessThan(year2100);
    });

    it("should work after calendar year rolls over", () => {
      // This test is more of a regression test
      // Just verify it returns reasonable value across year boundaries
      const now = adapter.now();
      const currentYear = new Date(now).getFullYear();

      expect(currentYear).toBeGreaterThanOrEqual(2021);
      expect(currentYear).toBeLessThan(2100);
    });
  });

  describe("isoNow()", () => {
    it("should return ISO 8601 formatted string", () => {
      const result = adapter.isoNow();

      // ISO 8601 format: YYYY-MM-DDTHH:mm:ss.SSSZ
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
      expect(result).toMatch(isoRegex);
    });

    it("should return string type", () => {
      const result = adapter.isoNow();
      expect(typeof result).toBe("string");
    });

    it("should be parseable as valid ISO timestamp", () => {
      const result = adapter.isoNow();
      const date = new Date(result);

      expect(date instanceof Date).toBe(true);
      expect(!isNaN(date.getTime())).toBe(true);
    });

    it("should be consistent with current time", () => {
      const beforeDate = new Date();
      const isoString = adapter.isoNow();
      const afterDate = new Date();

      const parsedDate = new Date(isoString);

      expect(parsedDate.getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
      expect(parsedDate.getTime()).toBeLessThanOrEqual(afterDate.getTime() + 1);
    });

    it("should end with Z (UTC timezone)", () => {
      const result = adapter.isoNow();
      expect(result).toMatch(/Z$/);
    });

    it("should have millisecond precision", () => {
      const result = adapter.isoNow();

      // Find the milliseconds part
      const match = result.match(/\.(\d{3})Z/);
      expect(match).not.toBeNull();
      if (match) {
        expect(match[1]).toMatch(/^\d{3}$/);
      }
    });

    it("should increase over time", (done) => {
      const iso1 = adapter.isoNow();

      setTimeout(() => {
        const iso2 = adapter.isoNow();

        const date1 = new Date(iso1).getTime();
        const date2 = new Date(iso2).getTime();

        expect(date2).toBeGreaterThan(date1);
        done();
      }, 10);
    });

    it("should be consistent with Date.now()", () => {
      const adapterIso = adapter.isoNow();
      const dateNow = Date.now();

      const adapterTime = new Date(adapterIso).getTime();

      expect(Math.abs(adapterTime - dateNow)).toBeLessThan(10);
    });

    it("should handle rapid consecutive calls", () => {
      const isoTimes = [];
      for (let i = 0; i < 10; i++) {
        isoTimes.push(adapter.isoNow());
      }

      // All should be valid ISO strings
      isoTimes.forEach((iso) => {
        expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(iso).toMatch(/Z$/);
      });

      // Convert to timestamps and verify monotonic
      const timestamps = isoTimes.map((iso) => new Date(iso).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
    });

    it("should properly represent year/month/day", () => {
      const result = adapter.isoNow();
      const date = new Date(result);

      const isoFromDate = date.toISOString();

      // Both should have same structure
      expect(result).toMatch(/^\d{4}/); // Year
      expect(result).toContain("-"); // Month separator
      expect(result).toContain("T"); // Date-time separator
      expect(result).toContain(":"); // Time separators
    });

    it("should work across calendar boundaries", () => {
      // Just verify it doesn't break at year boundaries
      const iso = adapter.isoNow();
      const date = new Date(iso);

      expect(date.getFullYear()).toBeGreaterThanOrEqual(2021);
      expect(date.getMonth()).toBeGreaterThanOrEqual(0);
      expect(date.getMonth()).toBeLessThanOrEqual(11);
      expect(date.getDate()).toBeGreaterThanOrEqual(1);
      expect(date.getDate()).toBeLessThanOrEqual(31);
    });
  });

  describe("Integration & ClockPort Interface", () => {
    it("should implement ClockPort interface", () => {
      expect(adapter).toHaveProperty("now");
      expect(adapter).toHaveProperty("isoNow");
      expect(typeof adapter.now).toBe("function");
      expect(typeof adapter.isoNow).toBe("function");
    });

    it("should provide coherent time values", () => {
      const nowMs = adapter.now();
      const isoString = adapter.isoNow();

      const dateFromIso = new Date(isoString).getTime();

      // Should be very close (within 5ms)
      expect(Math.abs(nowMs - dateFromIso)).toBeLessThan(5);
    });

    it("should be injectable/singleton-compatible", () => {
      const adapter1 = new SystemClockAdapter();
      const adapter2 = new SystemClockAdapter();

      // Both should return consistent values
      const now1 = adapter1.now();
      const now2 = adapter2.now();

      expect(Math.abs(now1 - now2)).toBeLessThan(5);
    });

    it("should have stateless behavior", () => {
      // Multiple calls should not change state
      const result1 = adapter.now();
      const result2 = adapter.now();
      const result3 = adapter.now();

      // Results should be consistent (just different timestamps)
      expect(typeof result1).toBe("number");
      expect(typeof result2).toBe("number");
      expect(typeof result3).toBe("number");
    });

    it("should work with real-world time calculations", () => {
      const startTime = adapter.now();

      // Simulate waiting 100ms
      const endTime = startTime + 100;
      const currentTime = adapter.now();

      expect(currentTime).toBeLessThanOrEqual(endTime + 10); // 10ms tolerance
    });

    it("should convert ISO timestamp back to epoch accurately", () => {
      const nowMs = adapter.now();
      const isoString = adapter.isoNow();

      const dateFromIso = new Date(isoString);
      const msFromIso = dateFromIso.getTime();

      // When converting back, should match closely
      expect(Math.abs(nowMs - msFromIso)).toBeLessThan(5);
    });

    it("should handle concurrent adapter instances", (done) => {
      const adapter1 = new SystemClockAdapter();
      const adapter2 = new SystemClockAdapter();
      const adapter3 = new SystemClockAdapter();

      const times = [adapter1.now(), adapter2.now(), adapter3.now()];

      setTimeout(() => {
        const times2 = [adapter1.now(), adapter2.now(), adapter3.now()];

        // All should have advanced
        times2.forEach((time, i) => {
          expect(time).toBeGreaterThan(times[i]);
        });

        done();
      }, 10);
    });
  });

  describe("Edge Cases & Robustness", () => {
    it("should not throw on normal operation", () => {
      expect(() => {
        adapter.now();
        adapter.isoNow();
      }).not.toThrow();
    });

    it("should handle many rapid calls", () => {
      const calls = 1000;
      const results: number[] = [];

      expect(() => {
        for (let i = 0; i < calls; i++) {
          results.push(adapter.now());
        }
      }).not.toThrow();

      expect(results.length).toBe(calls);
      expect(results[results.length - 1]).toBeGreaterThanOrEqual(results[0]);
    });

    it("should maintain precision across operations", () => {
      const times = new Array(10).fill(null).map(() => adapter.now());

      // All should have millisecond precision (last digit varies)
      times.forEach((time) => {
        expect(time % 1).toBe(0); // No decimal part
      });
    });

    it("should work for duration calculations", () => {
      const start = adapter.now();

      // Simulate some work
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += i;
      }

      const end = adapter.now();
      const duration = end - start;

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(duration)).toBe(true);
    });

    it("should produce valid timestamps for date arithmetic", () => {
      const now = adapter.now();

      const dateObj = new Date(now);
      const tomorrow = new Date(now + 86400000); // Add 24 hours

      expect(tomorrow.getTime()).toBeGreaterThan(dateObj.getTime());
    });
  });
});
