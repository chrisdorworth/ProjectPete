import { describe, it, expect } from "vitest";
import { evaluateSuppression } from "../policies/suppression-policy.js";

describe("SuppressionPolicy", () => {
  it("suppresses permanently on hard bounce", () => {
    const result = evaluateSuppression({ type: "bounce", bounceType: "hard", email: "test@example.com" });
    expect(result.shouldSuppress).toBe(true);
    expect(result.permanent).toBe(true);
    expect(result.suppressFields).toContain("email");
  });

  it("does not suppress on soft bounce", () => {
    const result = evaluateSuppression({ type: "bounce", bounceType: "soft", email: "test@example.com" });
    expect(result.shouldSuppress).toBe(false);
  });

  it("suppresses permanently on unsubscribe", () => {
    const result = evaluateSuppression({ type: "unsubscribe", channel: "email" });
    expect(result.shouldSuppress).toBe(true);
    expect(result.permanent).toBe(true);
    expect(result.suppressFields).toContain("all");
  });

  it("suppresses permanently for deceased", () => {
    const result = evaluateSuppression({ type: "deceased" });
    expect(result.shouldSuppress).toBe(true);
    expect(result.permanent).toBe(true);
  });

  it("suppresses phone for DNC list", () => {
    const result = evaluateSuppression({ type: "dnc_list", listType: "federal" });
    expect(result.shouldSuppress).toBe(true);
    expect(result.suppressFields).toContain("phone");
    expect(result.suppressFields).not.toContain("email");
  });

  it("handles CCPA request", () => {
    const result = evaluateSuppression({ type: "ccpa_request" });
    expect(result.shouldSuppress).toBe(true);
    expect(result.permanent).toBe(true);
  });

  it("handles GDPR request", () => {
    const result = evaluateSuppression({ type: "gdpr_request" });
    expect(result.shouldSuppress).toBe(true);
    expect(result.permanent).toBe(true);
  });

  it("manual suppression is not permanent", () => {
    const result = evaluateSuppression({ type: "manual", reason: "Bad data", suppressedBy: "admin" });
    expect(result.shouldSuppress).toBe(true);
    expect(result.permanent).toBe(false);
  });
});
