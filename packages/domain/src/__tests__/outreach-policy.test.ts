import { describe, it, expect } from "vitest";
import {
  determineChannelPriority,
  selectBestVariant,
  validateOutreachContent,
  type OutreachContext,
} from "../policies/outreach-policy.js";

function makeContext(overrides: Partial<OutreachContext> = {}): OutreachContext {
  return {
    signalType: "deed_transfer",
    compositeScore: 70,
    hasEmail: true,
    hasCellPhone: false,
    hasHomeAddress: false,
    hasLinkedIn: false,
    hasConsent: false,
    previousChannelsUsed: [],
    daysSinceLastContact: null,
    ...overrides,
  };
}

describe("determineChannelPriority", () => {
  it("returns email when only email is available", () => {
    const result = determineChannelPriority(makeContext());
    expect(result).toEqual(["email"]);
  });

  it("returns empty array when no contact info is available", () => {
    const result = determineChannelPriority(
      makeContext({ hasEmail: false }),
    );
    expect(result).toEqual([]);
  });

  it("includes all available channels when all contact info present", () => {
    const result = determineChannelPriority(
      makeContext({
        hasEmail: true,
        hasCellPhone: true,
        hasHomeAddress: true,
        hasLinkedIn: true,
        hasConsent: true,
      }),
    );
    expect(result).toContain("email");
    expect(result).toContain("linkedin");
    expect(result).toContain("voicemail");
    expect(result).toContain("handwritten");
    expect(result).toContain("sms");
    expect(result).toHaveLength(5);
  });

  it("excludes sms when hasCellPhone but no consent", () => {
    const result = determineChannelPriority(
      makeContext({ hasCellPhone: true, hasConsent: false }),
    );
    expect(result).toContain("voicemail");
    expect(result).not.toContain("sms");
  });

  it("includes sms only when both hasCellPhone and hasConsent", () => {
    const result = determineChannelPriority(
      makeContext({ hasCellPhone: true, hasConsent: true }),
    );
    expect(result).toContain("sms");
    expect(result).toContain("voicemail");
  });

  it("prioritizes unused channels before previously used channels", () => {
    const result = determineChannelPriority(
      makeContext({
        hasEmail: true,
        hasLinkedIn: true,
        previousChannelsUsed: ["email"],
      }),
    );
    expect(result[0]).toBe("linkedin");
    expect(result[1]).toBe("email");
  });

  it("returns only previously used channels when all have been used", () => {
    const result = determineChannelPriority(
      makeContext({
        hasEmail: true,
        hasLinkedIn: true,
        previousChannelsUsed: ["email", "linkedin"],
      }),
    );
    expect(result).toHaveLength(2);
    expect(result).toContain("email");
    expect(result).toContain("linkedin");
  });

  it("does not include linkedin when hasLinkedIn is false", () => {
    const result = determineChannelPriority(
      makeContext({ hasLinkedIn: false }),
    );
    expect(result).not.toContain("linkedin");
  });
});

describe("selectBestVariant", () => {
  it("returns 'warm-intro' for email with high composite score", () => {
    const ctx = makeContext({ compositeScore: 85 });
    expect(selectBestVariant("email", ctx)).toBe("warm-intro");
  });

  it("returns 'value' for email with high-value signal and lower score", () => {
    const ctx = makeContext({ signalType: "deed_transfer", compositeScore: 60 });
    expect(selectBestVariant("email", ctx)).toBe("value");
  });

  it("returns 'rapport' for email with non-high-value signal and lower score", () => {
    const ctx = makeContext({ signalType: "intent_surge", compositeScore: 50 });
    expect(selectBestVariant("email", ctx)).toBe("rapport");
  });

  it("returns 'connection' for linkedin", () => {
    expect(selectBestVariant("linkedin", makeContext())).toBe("connection");
  });

  it("returns 'intro' for voicemail", () => {
    expect(selectBestVariant("voicemail", makeContext())).toBe("intro");
  });

  it("returns 'note' for handwritten", () => {
    expect(selectBestVariant("handwritten", makeContext())).toBe("note");
  });

  it("returns 'brief' for sms", () => {
    expect(selectBestVariant("sms", makeContext())).toBe("brief");
  });

  it("high score takes priority over high-value signal for email", () => {
    const ctx = makeContext({ signalType: "sec_form4", compositeScore: 90 });
    expect(selectBestVariant("email", ctx)).toBe("warm-intro");
  });

  it("returns 'value' for email with probate_filing signal", () => {
    const ctx = makeContext({ signalType: "probate_filing", compositeScore: 50 });
    expect(selectBestVariant("email", ctx)).toBe("value");
  });
});

describe("validateOutreachContent", () => {
  it("validates email within word limit", () => {
    const content = Array(100).fill("word").join(" ");
    const result = validateOutreachContent("email", content);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("rejects email exceeding word limit", () => {
    const content = Array(200).fill("word").join(" ");
    const result = validateOutreachContent("email", content);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain("Email exceeds");
    expect(result.issues[0]).toContain("150 word limit");
  });

  it("validates linkedin within character limit", () => {
    const content = "a".repeat(300);
    const result = validateOutreachContent("linkedin", content);
    expect(result.valid).toBe(true);
  });

  it("rejects linkedin exceeding character limit", () => {
    const content = "a".repeat(301);
    const result = validateOutreachContent("linkedin", content);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain("LinkedIn message exceeds");
  });

  it("validates sms within character limit", () => {
    const content = "a".repeat(160);
    const result = validateOutreachContent("sms", content);
    expect(result.valid).toBe(true);
  });

  it("rejects sms exceeding character limit", () => {
    const content = "a".repeat(161);
    const result = validateOutreachContent("sms", content);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain("SMS exceeds 160 character limit");
  });

  it("validates voicemail within word limit", () => {
    const content = Array(150).fill("word").join(" ");
    const result = validateOutreachContent("voicemail", content);
    expect(result.valid).toBe(true);
  });

  it("rejects voicemail exceeding word limit", () => {
    const content = Array(250).fill("word").join(" ");
    const result = validateOutreachContent("voicemail", content);
    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain("Voicemail script exceeds");
  });

  it("validates empty content as valid", () => {
    const result = validateOutreachContent("email", "");
    expect(result.valid).toBe(true);
  });
});
