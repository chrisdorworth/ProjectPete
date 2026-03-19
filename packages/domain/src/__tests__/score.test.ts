import { describe, it, expect } from "vitest";
import { CompositeScore, type ScoreBreakdown } from "../value-objects/score.js";

const emptyBreakdown: ScoreBreakdown = {
  signalStrength: 0,
  estimatedValue: 0,
  timing: 0,
  accessibility: 0,
  complexity: 0,
  convergenceBonus: 0,
  intentBonus: 0,
  warmPathBonus: 0,
};

function makeBreakdown(overrides: Partial<ScoreBreakdown> = {}): ScoreBreakdown {
  return { ...emptyBreakdown, ...overrides };
}

describe("CompositeScore", () => {
  it("creates with valid qualitative and quantitative scores", () => {
    const score = CompositeScore.create(30, 40, makeBreakdown());
    expect(score.qualitative).toBe(30);
    expect(score.quantitative).toBe(40);
    expect(score.total).toBe(70);
  });

  it("clamps qualitative to 0-50 range", () => {
    const score = CompositeScore.create(60, 20, makeBreakdown());
    expect(score.qualitative).toBe(50);
    expect(score.quantitative).toBe(20);
  });

  it("clamps quantitative to 0-50 range", () => {
    const score = CompositeScore.create(10, 80, makeBreakdown());
    expect(score.quantitative).toBe(50);
  });

  it("clamps negative qualitative to 0", () => {
    const score = CompositeScore.create(-10, 25, makeBreakdown());
    expect(score.qualitative).toBe(0);
  });

  it("clamps negative quantitative to 0", () => {
    const score = CompositeScore.create(25, -5, makeBreakdown());
    expect(score.quantitative).toBe(0);
  });

  it("clamps total to 0-100 range", () => {
    const score = CompositeScore.create(50, 50, makeBreakdown());
    expect(score.total).toBe(100);
  });

  it("rounds total to nearest integer", () => {
    const score = CompositeScore.create(25.4, 25.3, makeBreakdown());
    expect(score.total).toBe(51);
  });

  it("zero() returns all zeros", () => {
    const score = CompositeScore.zero();
    expect(score.total).toBe(0);
    expect(score.qualitative).toBe(0);
    expect(score.quantitative).toBe(0);
    expect(score.breakdown.signalStrength).toBe(0);
    expect(score.breakdown.convergenceBonus).toBe(0);
  });

  it("tier() returns 'hot' for scores >= 90", () => {
    const score = CompositeScore.create(45, 45, makeBreakdown());
    expect(score.tier()).toBe("hot");
  });

  it("tier() returns 'warm' for scores >= 70 and < 90", () => {
    const score = CompositeScore.create(35, 35, makeBreakdown());
    expect(score.tier()).toBe("warm");
  });

  it("tier() returns 'cool' for scores >= 40 and < 70", () => {
    const score = CompositeScore.create(25, 25, makeBreakdown());
    expect(score.tier()).toBe("cool");
  });

  it("tier() returns 'cold' for scores < 40", () => {
    const score = CompositeScore.create(10, 10, makeBreakdown());
    expect(score.tier()).toBe("cold");
  });

  it("isHighPriority for total >= 80", () => {
    const high = CompositeScore.create(40, 42, makeBreakdown());
    expect(high.isHighPriority()).toBe(true);
    expect(high.isMediumPriority()).toBe(false);
    expect(high.isLowPriority()).toBe(false);
  });

  it("isMediumPriority for total >= 50 and < 80", () => {
    const med = CompositeScore.create(30, 25, makeBreakdown());
    expect(med.isMediumPriority()).toBe(true);
    expect(med.isHighPriority()).toBe(false);
    expect(med.isLowPriority()).toBe(false);
  });

  it("isLowPriority for total < 50", () => {
    const low = CompositeScore.create(10, 10, makeBreakdown());
    expect(low.isLowPriority()).toBe(true);
    expect(low.isHighPriority()).toBe(false);
    expect(low.isMediumPriority()).toBe(false);
  });

  it("equals compares by total", () => {
    const a = CompositeScore.create(30, 20, makeBreakdown());
    const b = CompositeScore.create(20, 30, makeBreakdown());
    expect(a.equals(b)).toBe(true);
  });

  it("equals returns false for different totals", () => {
    const a = CompositeScore.create(30, 20, makeBreakdown());
    const b = CompositeScore.create(10, 10, makeBreakdown());
    expect(a.equals(b)).toBe(false);
  });

  it("toJSON serializes all fields", () => {
    const breakdown = makeBreakdown({ signalStrength: 5, timing: 3 });
    const score = CompositeScore.create(25, 30, breakdown);
    const json = score.toJSON();
    expect(json.total).toBe(55);
    expect(json.qualitative).toBe(25);
    expect(json.quantitative).toBe(30);
    expect(json.breakdown.signalStrength).toBe(5);
    expect(json.breakdown.timing).toBe(3);
  });

  it("preserves breakdown through serialization", () => {
    const breakdown = makeBreakdown({
      signalStrength: 10,
      estimatedValue: 5,
      convergenceBonus: 3,
    });
    const score = CompositeScore.create(20, 20, breakdown);
    const json = score.toJSON();
    expect(json.breakdown).toEqual(breakdown);
  });
});
