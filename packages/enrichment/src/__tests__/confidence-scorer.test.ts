import { describe, it, expect, vi } from "vitest";
import { getProviderConfidence, combineConfidences } from "../confidence-scorer.js";

vi.mock("@meridian/domain", () => {
  return {
    Confidence: {
      create: (value: number, source: string) => ({
        value: Math.round(value * 1000) / 1000,
        source,
        combine: function (other: { value: number; source: string }) {
          const combined = 1 - (1 - this.value) * (1 - other.value);
          return {
            value: Math.round(combined * 1000) / 1000,
            source: `${this.source}+${other.source}`,
            combine: function (o: { value: number; source: string }) {
              const c = 1 - (1 - this.value) * (1 - o.value);
              return {
                value: Math.round(c * 1000) / 1000,
                source: `${this.source}+${o.source}`,
                combine: () => {},
              };
            },
          };
        },
      }),
      zero: (source: string) => ({
        value: 0,
        source,
        combine: function (other: { value: number; source: string }) {
          return other;
        },
      }),
    },
  };
});

describe("getProviderConfidence", () => {
  it("returns apollo base confidence of 0.85", () => {
    const conf = getProviderConfidence("apollo", 0);
    expect(conf.value).toBeCloseTo(0.85, 2);
    expect(conf.source).toBe("apollo");
  });

  it("returns hunter base confidence of 0.80", () => {
    const conf = getProviderConfidence("hunter", 0);
    expect(conf.value).toBeCloseTo(0.80, 2);
    expect(conf.source).toBe("hunter");
  });

  it("returns default 0.5 for unknown provider", () => {
    const conf = getProviderConfidence("unknown-provider", 0);
    expect(conf.value).toBeCloseTo(0.5, 2);
  });

  it("adds field bonus (0.02 per field, max 0.1)", () => {
    const conf = getProviderConfidence("clearbit", 3);
    // base 0.75 + 3 * 0.02 = 0.81
    expect(conf.value).toBeCloseTo(0.81, 2);
  });

  it("caps field bonus at 0.1", () => {
    const conf = getProviderConfidence("pipl", 10);
    // base 0.65 + min(0.1, 10*0.02) = 0.65 + 0.1 = 0.75
    expect(conf.value).toBeCloseTo(0.75, 2);
  });

  it("caps total confidence at 1.0", () => {
    const conf = getProviderConfidence("apollo", 10);
    // base 0.85 + 0.1 = 0.95, under 1 so no cap needed
    expect(conf.value).toBeLessThanOrEqual(1);
    expect(conf.value).toBeCloseTo(0.95, 2);
  });
});

describe("combineConfidences", () => {
  it("returns zero confidence for empty array", () => {
    const result = combineConfidences([]);
    expect(result.value).toBe(0);
    expect(result.source).toBe("none");
  });

  it("returns single confidence unchanged", () => {
    const single = getProviderConfidence("apollo", 0);
    const result = combineConfidences([single]);
    // With single element, reduce returns the element itself
    expect(result.value).toBeCloseTo(0.85, 2);
  });

  it("probabilistically combines two confidences", () => {
    const a = getProviderConfidence("apollo", 0);  // 0.85
    const b = getProviderConfidence("hunter", 0);  // 0.80
    const result = combineConfidences([a, b]);

    // 1 - (1-0.85)*(1-0.80) = 1 - 0.15*0.20 = 1 - 0.03 = 0.97
    expect(result.value).toBeCloseTo(0.97, 2);
  });

  it("combined source string includes both provider names", () => {
    const a = getProviderConfidence("apollo", 0);
    const b = getProviderConfidence("hunter", 0);
    const result = combineConfidences([a, b]);

    expect(result.source).toContain("apollo");
    expect(result.source).toContain("hunter");
  });
});
