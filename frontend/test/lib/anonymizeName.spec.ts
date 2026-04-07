/**
 * 🧪 Tests for anonymizeName utility (SPEC-009)
 *
 * Covers all acceptance criteria from SPEC-009:
 *   CRITERIO-1.1: full name → "First I. I. I."
 *   CRITERIO-1.3: single term → unchanged
 *   CRITERIO-1.4: two terms  → "First I."
 * Plus edge cases: empty string, extra whitespace
 */

import { anonymizeName } from "@/lib/anonymizeName";

describe("anonymizeName", () => {
  it("CRITERIO-1.1: converts full name to first + initials", () => {
    expect(anonymizeName("Juan Carlos Pérez López")).toBe("Juan C. P. L.");
  });

  it("CRITERIO-1.3: returns single-term name unchanged", () => {
    expect(anonymizeName("María")).toBe("María");
  });

  it("CRITERIO-1.4: two-term name returns first + one initial", () => {
    expect(anonymizeName("Ana García")).toBe("Ana G.");
  });

  it("handles empty string without crashing", () => {
    expect(anonymizeName("")).toBe("");
  });

  it("handles whitespace-only string without crashing", () => {
    expect(anonymizeName("   ")).toBe("");
  });

  it("trims leading/trailing whitespace before processing", () => {
    expect(anonymizeName("  Ana García  ")).toBe("Ana G.");
  });

  it("normalises internal extra whitespace between words", () => {
    expect(anonymizeName("Juan  Carlos  Pérez")).toBe("Juan C. P.");
  });

  it("uppercases initials regardless of original casing", () => {
    expect(anonymizeName("juan carlos")).toBe("juan C.");
  });
});
