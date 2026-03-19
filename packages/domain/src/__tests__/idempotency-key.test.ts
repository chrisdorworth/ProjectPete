import { describe, it, expect } from "vitest";
import { IdempotencyKey } from "../value-objects/idempotency-key.js";

describe("IdempotencyKey", () => {
  it("generates deterministic keys", () => {
    const a = IdempotencyKey.fromParts("deed", "Orange", "1234/567", "2025-01-15");
    const b = IdempotencyKey.fromParts("deed", "Orange", "1234/567", "2025-01-15");
    expect(a.equals(b)).toBe(true);
  });

  it("generates different keys for different inputs", () => {
    const a = IdempotencyKey.fromParts("deed", "Orange", "1234/567", "2025-01-15");
    const b = IdempotencyKey.fromParts("deed", "Seminole", "1234/567", "2025-01-15");
    expect(a.equals(b)).toBe(false);
  });

  it("normalizes case", () => {
    const a = IdempotencyKey.fromParts("DEED", "ORANGE", "1234/567");
    const b = IdempotencyKey.fromParts("deed", "orange", "1234/567");
    expect(a.equals(b)).toBe(true);
  });

  it("trims whitespace", () => {
    const a = IdempotencyKey.fromParts(" deed ", " Orange ");
    const b = IdempotencyKey.fromParts("deed", "Orange");
    expect(a.equals(b)).toBe(true);
  });

  it("generates correct length", () => {
    const key = IdempotencyKey.forDeedTransfer("Orange", "1234/567", "2025-01-15");
    expect(key.value.length).toBe(32);
  });

  it("has factory methods for each source type", () => {
    expect(IdempotencyKey.forDeedTransfer("Orange", "1234", "2025-01-01").value).toBeTruthy();
    expect(IdempotencyKey.forSecFiling("0001234", "4", "2025-01-01").value).toBeTruthy();
    expect(IdempotencyKey.forProbate("Orange", "2025-CP-001").value).toBeTruthy();
    expect(IdempotencyKey.forBusinessFiling("L12345", "dissolution", "2025-01-01").value).toBeTruthy();
    expect(IdempotencyKey.forNews("https://example.com/article").value).toBeTruthy();
    expect(IdempotencyKey.forLinkedIn("/in/john", "retirement", "2025-01-01").value).toBeTruthy();
    expect(IdempotencyKey.forLicense("fl-medical", "ME12345", "retired").value).toBeTruthy();
    expect(IdempotencyKey.forPatent("US12345", "2025-01-01").value).toBeTruthy();
    expect(IdempotencyKey.forIntent("acme.com", "financial_planning", "2025-W03").value).toBeTruthy();
  });
});
