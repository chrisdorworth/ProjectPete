import { describe, it, expect } from "vitest";
import { Money } from "../value-objects/money.js";

describe("Money", () => {
  it("creates from cents", () => {
    const m = Money.fromCents(10050);
    expect(m.cents).toBe(10050n);
  });

  it("creates from bigint cents", () => {
    const m = Money.fromCents(65000000n);
    expect(m.cents).toBe(65000000n);
  });

  it("creates from dollars", () => {
    const m = Money.fromDollars(100.50);
    expect(m.cents).toBe(10050n);
  });

  it("adds correctly", () => {
    const a = Money.fromDollars(100);
    const b = Money.fromDollars(50.25);
    expect(a.add(b).cents).toBe(15025n);
  });

  it("subtracts correctly", () => {
    const a = Money.fromDollars(100);
    const b = Money.fromDollars(30);
    expect(a.subtract(b).cents).toBe(7000n);
  });

  it("multiplies correctly", () => {
    const m = Money.fromDollars(100);
    expect(m.multiply(0.015).cents).toBe(150n);
  });

  it("compares correctly", () => {
    const a = Money.fromDollars(100);
    const b = Money.fromDollars(200);
    expect(a.isLessThan(b)).toBe(true);
    expect(b.isGreaterThan(a)).toBe(true);
  });

  it("formats to currency string", () => {
    const m = Money.fromCents(65000000);
    expect(m.toFormattedString()).toBe("$650,000");
  });

  it("serializes and deserializes", () => {
    const original = Money.fromCents(123456789n);
    const json = original.toJSON();
    const restored = Money.fromJSON(json);
    expect(restored.equals(original)).toBe(true);
  });

  it("zero is zero", () => {
    expect(Money.zero().isZero()).toBe(true);
  });

  it("never uses floats internally", () => {
    const m = Money.fromDollars(0.1 + 0.2);
    expect(typeof m.cents).toBe("bigint");
  });

  it("rejects negative cents", () => {
    expect(() => Money.fromCents(-100)).toThrow("Money cannot be negative");
  });

  it("rejects negative dollars", () => {
    expect(() => Money.fromDollars(-50)).toThrow("Money cannot be negative");
  });

  it("rejects negative multiply factor", () => {
    const m = Money.fromCents(100);
    expect(() => m.multiply(-1)).toThrow("Money multiply factor cannot be negative");
  });

  it("converts to dollars correctly", () => {
    const m = Money.fromCents(12345);
    expect(m.toDollars()).toBe(123.45);
  });

  it("handles equality", () => {
    const a = Money.fromCents(100);
    const b = Money.fromCents(100);
    const c = Money.fromCents(200);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});
