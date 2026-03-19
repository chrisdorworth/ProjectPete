import { describe, it, expect } from "vitest";
import {
  OutreachChannels,
  CHANNEL_CONSTRAINTS,
  CHANNEL_PRIORITY_ORDER,
  getChannelConstraints,
  requiresConsent,
  type OutreachChannel,
} from "../value-objects/outreach-channel.js";

describe("OutreachChannels", () => {
  it("defines all five channels", () => {
    expect(OutreachChannels.EMAIL).toBe("email");
    expect(OutreachChannels.LINKEDIN).toBe("linkedin");
    expect(OutreachChannels.VOICEMAIL).toBe("voicemail");
    expect(OutreachChannels.HANDWRITTEN).toBe("handwritten");
    expect(OutreachChannels.SMS).toBe("sms");
  });

  it("has exactly 5 channel keys", () => {
    expect(Object.keys(OutreachChannels)).toHaveLength(5);
  });
});

describe("CHANNEL_CONSTRAINTS", () => {
  const channels: OutreachChannel[] = ["email", "linkedin", "voicemail", "handwritten", "sms"];

  it("has constraints for every channel", () => {
    for (const ch of channels) {
      expect(CHANNEL_CONSTRAINTS[ch]).toBeDefined();
    }
  });

  it("every channel has required fields", () => {
    for (const ch of channels) {
      const c = CHANNEL_CONSTRAINTS[ch];
      expect(typeof c.maxLength).toBe("number");
      expect(typeof c.requiresConsent).toBe("boolean");
      expect(Array.isArray(c.complianceRules)).toBe(true);
      expect(c.complianceRules.length).toBeGreaterThan(0);
      expect(typeof c.cooldownDays).toBe("number");
      expect(typeof c.costCentsPerUnit).toBe("number");
    }
  });

  it("maxLength values are positive and reasonable", () => {
    for (const ch of channels) {
      const c = CHANNEL_CONSTRAINTS[ch];
      expect(c.maxLength).toBeGreaterThan(0);
      expect(c.maxLength).toBeLessThanOrEqual(1000);
    }
  });

  it("cooldownDays are positive", () => {
    for (const ch of channels) {
      expect(CHANNEL_CONSTRAINTS[ch].cooldownDays).toBeGreaterThan(0);
    }
  });

  it("costCentsPerUnit is non-negative", () => {
    for (const ch of channels) {
      expect(CHANNEL_CONSTRAINTS[ch].costCentsPerUnit).toBeGreaterThanOrEqual(0);
    }
  });

  it("email has CAN-SPAM compliance rule", () => {
    expect(CHANNEL_CONSTRAINTS.email.complianceRules).toContain("CAN-SPAM");
  });

  it("sms has TCPA compliance rule", () => {
    expect(CHANNEL_CONSTRAINTS.sms.complianceRules).toContain("TCPA");
  });

  it("sms requires consent", () => {
    expect(CHANNEL_CONSTRAINTS.sms.requiresConsent).toBe(true);
  });

  it("email does not require consent", () => {
    expect(CHANNEL_CONSTRAINTS.email.requiresConsent).toBe(false);
  });

  it("handwritten is the most expensive channel", () => {
    const handwrittenCost = CHANNEL_CONSTRAINTS.handwritten.costCentsPerUnit;
    for (const ch of channels) {
      expect(handwrittenCost).toBeGreaterThanOrEqual(CHANNEL_CONSTRAINTS[ch].costCentsPerUnit);
    }
  });

  it("handwritten has the longest cooldown", () => {
    const handwrittenCooldown = CHANNEL_CONSTRAINTS.handwritten.cooldownDays;
    for (const ch of channels) {
      expect(handwrittenCooldown).toBeGreaterThanOrEqual(CHANNEL_CONSTRAINTS[ch].cooldownDays);
    }
  });
});

describe("getChannelConstraints", () => {
  it("returns constraints for a given channel", () => {
    const constraints = getChannelConstraints("email");
    expect(constraints.maxLength).toBe(150);
    expect(constraints.cooldownDays).toBe(14);
  });
});

describe("requiresConsent", () => {
  it("returns true for sms", () => {
    expect(requiresConsent("sms")).toBe(true);
  });

  it("returns false for email", () => {
    expect(requiresConsent("email")).toBe(false);
  });

  it("returns false for linkedin", () => {
    expect(requiresConsent("linkedin")).toBe(false);
  });
});

describe("CHANNEL_PRIORITY_ORDER", () => {
  it("lists email first", () => {
    expect(CHANNEL_PRIORITY_ORDER[0]).toBe("email");
  });

  it("contains all five channels", () => {
    expect(CHANNEL_PRIORITY_ORDER).toHaveLength(5);
    expect(CHANNEL_PRIORITY_ORDER).toContain("email");
    expect(CHANNEL_PRIORITY_ORDER).toContain("linkedin");
    expect(CHANNEL_PRIORITY_ORDER).toContain("voicemail");
    expect(CHANNEL_PRIORITY_ORDER).toContain("handwritten");
    expect(CHANNEL_PRIORITY_ORDER).toContain("sms");
  });
});
