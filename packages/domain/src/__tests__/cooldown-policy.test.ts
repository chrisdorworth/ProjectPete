import { describe, it, expect } from "vitest";
import { checkCooldown } from "../policies/cooldown-policy.js";

describe("CooldownPolicy", () => {
  const now = new Date("2025-03-15");

  it("allows contact when no previous contact", () => {
    const result = checkCooldown({
      channel: "email",
      leadId: "lead-1",
      signalType: "deed_transfer",
      lastContactAt: null,
      lastContactChannel: null,
      isBereaved: false,
    }, now);
    expect(result.canContact).toBe(true);
  });

  it("blocks email within 14-day cooldown", () => {
    const result = checkCooldown({
      channel: "email",
      leadId: "lead-1",
      signalType: "deed_transfer",
      lastContactAt: new Date("2025-03-05"),
      lastContactChannel: "email",
      isBereaved: false,
    }, now);
    expect(result.canContact).toBe(false);
    expect(result.cooldownDays).toBe(14);
  });

  it("allows email after 14-day cooldown", () => {
    const result = checkCooldown({
      channel: "email",
      leadId: "lead-1",
      signalType: "deed_transfer",
      lastContactAt: new Date("2025-02-25"),
      lastContactChannel: "email",
      isBereaved: false,
    }, now);
    expect(result.canContact).toBe(true);
  });

  it("enforces 21-day bereavement cooldown for probate", () => {
    const result = checkCooldown({
      channel: "email",
      leadId: "lead-1",
      signalType: "probate_filing",
      lastContactAt: new Date("2025-03-01"),
      lastContactChannel: "email",
      isBereaved: false,
    }, now);
    expect(result.canContact).toBe(false);
    expect(result.cooldownDays).toBe(21);
  });

  it("enforces 21-day cooldown for bereaved leads", () => {
    const result = checkCooldown({
      channel: "voicemail",
      leadId: "lead-1",
      signalType: "deed_transfer",
      lastContactAt: new Date("2025-03-05"),
      lastContactChannel: "voicemail",
      isBereaved: true,
    }, now);
    expect(result.canContact).toBe(false);
  });

  it("enforces 60-day handwritten cooldown", () => {
    const result = checkCooldown({
      channel: "handwritten",
      leadId: "lead-1",
      signalType: "deed_transfer",
      lastContactAt: new Date("2025-02-01"),
      lastContactChannel: "handwritten",
      isBereaved: false,
    }, now);
    expect(result.canContact).toBe(false);
  });
});
