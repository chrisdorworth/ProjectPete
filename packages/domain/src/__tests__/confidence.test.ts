import { describe, it, expect } from "vitest";
import { Confidence } from "../value-objects/confidence.js";

describe("Confidence", () => {
  it("creates with valid value", () => {
    const c = Confidence.create(0.85, "apollo");
    expect(c.value).toBe(0.85);
    expect(c.source).toBe("apollo");
  });

  it("throws on out-of-range value", () => {
    expect(() => Confidence.create(-0.1, "test")).toThrow();
    expect(() => Confidence.create(1.1, "test")).toThrow();
  });

  it("creates preset levels", () => {
    expect(Confidence.high("test").isHigh()).toBe(true);
    expect(Confidence.medium("test").isMedium()).toBe(true);
    expect(Confidence.low("test").isLow()).toBe(true);
  });

  it("combines probabilities correctly", () => {
    const a = Confidence.create(0.8, "source1");
    const b = Confidence.create(0.7, "source2");
    const combined = a.combine(b);
    expect(combined.value).toBeGreaterThan(a.value);
    expect(combined.value).toBeLessThanOrEqual(1.0);
    expect(combined.source).toContain("source1");
    expect(combined.source).toContain("source2");
  });

  it("serializes correctly", () => {
    const c = Confidence.create(0.75, "hunter");
    const json = c.toJSON();
    expect(json.value).toBe(0.75);
    expect(json.source).toBe("hunter");
  });
});
