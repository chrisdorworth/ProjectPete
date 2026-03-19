import { describe, it, expect, vi } from "vitest";
import { estimateWealth, type WealthInput } from "../wealth-estimator.js";

vi.mock("@meridian/domain", () => {
  return {
    Money: {
      fromCents: (cents: bigint) => ({
        cents,
        toDollars: () => Number(cents) / 100,
        toFormattedString: () => `$${(Number(cents) / 100).toLocaleString()}`,
      }),
    },
  };
});

function makeInput(overrides: Partial<WealthInput> = {}): WealthInput {
  return {
    signalValueCents: 0n,
    propertyValueCents: null,
    salaryEstimateCents: null,
    ageEstimate: null,
    isProfessional: false,
    title: null,
    signals: [],
    ...overrides,
  };
}

describe("estimateWealth", () => {
  it("estimates wealth from property value (3x multiplier)", () => {
    const input = makeInput({
      propertyValueCents: 50_000_000n, // $500,000 property
    });

    const result = estimateWealth(input);

    // Property * 3 = 150_000_000 cents = $1,500,000
    expect(result.cents).toBe(150_000_000n);
  });

  it("estimates wealth from salary and age", () => {
    const input = makeInput({
      salaryEstimateCents: 10_000_000n, // $100,000/yr salary
      ageEstimate: 45,
    });

    const result = estimateWealth(input);

    // yearsSaving = 45 - 25 = 20
    // estimatedSavings = 10_000_000 * 20 * 15 / 100 = 30_000_000 cents = $300,000
    expect(result.cents).toBe(30_000_000n);
  });

  it("combines signals into total", () => {
    const input = makeInput({
      signals: [
        { type: "donation", valueCents: 5_000_00n },   // $5,000
        { type: "investment", valueCents: 10_000_00n }, // $10,000
      ],
    });

    const result = estimateWealth(input);

    expect(result.cents).toBe(5_000_00n + 10_000_00n);
  });

  it("uses salary estimate when it exceeds signal+property total", () => {
    const input = makeInput({
      propertyValueCents: 10_000_00n, // $10,000 property -> 3x = $30,000
      salaryEstimateCents: 15_000_000n, // $150,000/yr salary
      ageEstimate: 55, // yearsSaving = 30
    });

    const result = estimateWealth(input);

    // property contribution = 10_000_00 * 3 = 30_000_00 = $30,000
    // salary savings = 15_000_000 * 30 * 15 / 100 = 67_500_000 = $675,000
    // salary savings > property total, so salary wins
    expect(result.cents).toBe(67_500_000n);
  });

  it("applies professional bonus (25%)", () => {
    const input = makeInput({
      propertyValueCents: 40_000_000n, // $400,000
      isProfessional: true,
    });

    const result = estimateWealth(input);

    // property = 40_000_000 * 3 = 120_000_000
    // professional bonus = 120_000_000 / 4 = 30_000_000
    // total = 150_000_000 = $1,500,000
    expect(result.cents).toBe(150_000_000n);
  });

  it("applies CEO title multiplier (1.5x)", () => {
    const input = makeInput({
      propertyValueCents: 20_000_000n, // $200,000
      title: "CEO",
    });

    const result = estimateWealth(input);

    // property = 20_000_000 * 3 = 60_000_000
    // CEO multiplier: 60_000_000 * 15 / 10 = 90_000_000
    expect(result.cents).toBe(90_000_000n);
  });

  it("applies VP/Director title multiplier (1.2x)", () => {
    const input = makeInput({
      propertyValueCents: 20_000_000n,
      title: "VP of Sales",
    });

    const result = estimateWealth(input);

    // property = 60_000_000
    // VP multiplier: 60_000_000 * 12 / 10 = 72_000_000
    expect(result.cents).toBe(72_000_000n);
  });

  it("returns zero for completely missing data", () => {
    const input = makeInput();
    const result = estimateWealth(input);

    expect(result.cents).toBe(0n);
  });

  it("handles age younger than 25 with salary (zero savings years)", () => {
    const input = makeInput({
      salaryEstimateCents: 5_000_000n,
      ageEstimate: 22,
    });

    const result = estimateWealth(input);

    // yearsSaving = max(0, 22 - 25) = 0, so salary contribution is 0
    expect(result.cents).toBe(0n);
  });

  it("stacks professional bonus with title multiplier", () => {
    const input = makeInput({
      propertyValueCents: 10_000_000n, // $100,000
      isProfessional: true,
      title: "Founder & CEO",
    });

    const result = estimateWealth(input);

    // property = 10_000_000 * 3 = 30_000_000
    // professional bonus = 30_000_000 / 4 = 7_500_000
    // subtotal = 37_500_000
    // CEO title: 37_500_000 * 15 / 10 = 56_250_000
    expect(result.cents).toBe(56_250_000n);
  });
});
