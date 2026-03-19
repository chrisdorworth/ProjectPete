import { describe, it, expect } from "vitest";
import { evaluateRetention, getFieldsToPurge, getFieldsToPreserve } from "../policies/retention-policy.js";

describe("RetentionPolicy", () => {
  const now = new Date("2025-06-15");

  it("takes no action for recently active leads", () => {
    const result = evaluateRetention({
      leadId: "lead-1",
      status: "scored",
      lastActivityAt: new Date("2025-05-01"),
      lastContactAt: null,
      createdAt: new Date("2025-01-01"),
      isSuppressed: false,
      isConverted: false,
      hasActiveOutreach: false,
    }, now);
    expect(result.type).toBe("none");
  });

  it("flags for review at 11+ months", () => {
    const result = evaluateRetention({
      leadId: "lead-1",
      status: "new",
      lastActivityAt: new Date("2024-07-20"),
      lastContactAt: null,
      createdAt: new Date("2024-01-01"),
      isSuppressed: false,
      isConverted: false,
      hasActiveOutreach: false,
    }, now);
    expect(result.type).toBe("flag_for_review");
  });

  it("schedules purge at 12+ months", () => {
    const result = evaluateRetention({
      leadId: "lead-1",
      status: "new",
      lastActivityAt: new Date("2024-06-01"),
      lastContactAt: null,
      createdAt: new Date("2024-01-01"),
      isSuppressed: false,
      isConverted: false,
      hasActiveOutreach: false,
    }, now);
    expect(result.type).toBe("schedule_purge");
  });

  it("purges immediately at 24+ months", () => {
    const result = evaluateRetention({
      leadId: "lead-1",
      status: "new",
      lastActivityAt: new Date("2023-06-01"),
      lastContactAt: null,
      createdAt: new Date("2023-01-01"),
      isSuppressed: false,
      isConverted: false,
      hasActiveOutreach: false,
    }, now);
    expect(result.type).toBe("purge_now");
    if (result.type === "purge_now") {
      expect(result.method).toBe("crypto_shred");
    }
  });

  it("never purges converted leads", () => {
    const result = evaluateRetention({
      leadId: "lead-1",
      status: "converted",
      lastActivityAt: new Date("2023-01-01"),
      lastContactAt: null,
      createdAt: new Date("2022-01-01"),
      isSuppressed: false,
      isConverted: true,
      hasActiveOutreach: false,
    }, now);
    expect(result.type).toBe("none");
  });

  it("does not purge leads with active outreach", () => {
    const result = evaluateRetention({
      leadId: "lead-1",
      status: "contacted",
      lastActivityAt: new Date("2023-06-01"),
      lastContactAt: new Date("2025-06-01"),
      createdAt: new Date("2023-01-01"),
      isSuppressed: false,
      isConverted: false,
      hasActiveOutreach: true,
    }, now);
    expect(result.type).toBe("none");
  });

  it("PII fields are in purge list", () => {
    const fields = getFieldsToPurge();
    expect(fields).toContain("firstName");
    expect(fields).toContain("email");
    expect(fields).toContain("phone");
    expect(fields).toContain("homeAddress");
  });

  it("preserves minimal fields", () => {
    const preserved = getFieldsToPreserve();
    expect(preserved).toContain("id");
    expect(preserved).toContain("purgedAt");
  });
});
