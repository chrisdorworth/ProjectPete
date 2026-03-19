import { describe, it, expect } from "vitest";
import { calculateQuantitativeScore, applyRecencyDecay } from "../policies/scoring-policy.js";

describe("ScoringPolicy", () => {
  const baseInput = {
    signals: [{
      type: "deed_transfer" as const,
      valueCents: 65000000n,
      detectedAt: new Date(),
      confidence: 0.9,
    }],
    enrichmentCompleteness: 0.8,
    hasEmail: true,
    hasCellPhone: true,
    hasHomeAddress: true,
    hasWarmPath: false,
    networkProximity: null,
    intentScore: 0,
    intentMatchesSignal: false,
    householdSize: 1,
    householdValueCents: 0n,
    ageEstimate: 62,
    isProfessional: true,
    rapportHookCount: 3,
  };

  it("calculates score for high-value lead", () => {
    const result = calculateQuantitativeScore(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(20);
    expect(result.score).toBeLessThanOrEqual(50);
    expect(result.breakdown.signalStrength).toBeGreaterThan(0);
    expect(result.breakdown.estimatedValue).toBeGreaterThan(0);
  });

  it("adds convergence bonus for multiple signals", () => {
    const multiSignal = {
      ...baseInput,
      signals: [
        ...baseInput.signals,
        { type: "sec_form4" as const, valueCents: 100000000n, detectedAt: new Date(), confidence: 0.95 },
      ],
    };
    const single = calculateQuantitativeScore(baseInput);
    const multi = calculateQuantitativeScore(multiSignal);
    expect(multi.breakdown.convergenceBonus).toBe(5);
    expect(multi.score).toBeGreaterThan(single.score);
  });

  it("adds warm path bonus", () => {
    const withWarmPath = { ...baseInput, hasWarmPath: true };
    const result = calculateQuantitativeScore(withWarmPath);
    expect(result.breakdown.warmPathBonus).toBe(4);
  });

  it("adds intent bonus when intent matches signal", () => {
    const withIntent = { ...baseInput, intentMatchesSignal: true };
    const result = calculateQuantitativeScore(withIntent);
    expect(result.breakdown.intentBonus).toBe(3);
  });

  it("caps score at 50", () => {
    const maxInput = {
      ...baseInput,
      hasWarmPath: true,
      intentMatchesSignal: true,
      signals: [
        { type: "deed_transfer" as const, valueCents: 500000000n, detectedAt: new Date(), confidence: 1.0 },
        { type: "sec_form4" as const, valueCents: 500000000n, detectedAt: new Date(), confidence: 1.0 },
      ],
    };
    const result = calculateQuantitativeScore(maxInput);
    expect(result.score).toBeLessThanOrEqual(50);
  });

  it("returns 0 for no signals", () => {
    const empty = { ...baseInput, signals: [] };
    const result = calculateQuantitativeScore(empty);
    expect(result.breakdown.signalStrength).toBe(0);
  });
});

describe("RecencyDecay", () => {
  it("returns 100 for signals within 7 days", () => {
    expect(applyRecencyDecay(3)).toBe(100);
  });

  it("returns 90 for 14-day signals", () => {
    expect(applyRecencyDecay(14)).toBe(90);
  });

  it("decays over time", () => {
    const week1 = applyRecencyDecay(5);
    const month1 = applyRecencyDecay(25);
    const month3 = applyRecencyDecay(80);
    expect(week1).toBeGreaterThan(month1);
    expect(month1).toBeGreaterThan(month3);
  });

  it("floors at 10 for very old signals", () => {
    expect(applyRecencyDecay(365)).toBe(10);
  });
});
