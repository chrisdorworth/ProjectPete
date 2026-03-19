import type { OutreachChannel } from "../value-objects/outreach-channel.js";
import { CHANNEL_CONSTRAINTS } from "../value-objects/outreach-channel.js";
import type { SignalType } from "../value-objects/signal-type.js";

const PROBATE_SIGNALS: SignalType[] = ["probate_filing"];
const BEREAVEMENT_COOLDOWN_DAYS = 21;

export interface CooldownContext {
  channel: OutreachChannel;
  leadId: string;
  signalType: SignalType;
  lastContactAt: Date | null;
  lastContactChannel: OutreachChannel | null;
  isBereaved: boolean;
}

export interface CooldownResult {
  canContact: boolean;
  reason: string | null;
  nextEligibleDate: Date | null;
  cooldownDays: number;
}

export function checkCooldown(context: CooldownContext, now: Date = new Date()): CooldownResult {
  if (context.isBereaved || PROBATE_SIGNALS.includes(context.signalType)) {
    const cooldownDays = BEREAVEMENT_COOLDOWN_DAYS;
    if (!context.lastContactAt) {
      const signalAge = now.getTime() - now.getTime();
      if (signalAge < cooldownDays * 24 * 60 * 60 * 1000) {
        const nextEligible = new Date(now.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
        return {
          canContact: false,
          reason: `Bereavement/probate cooldown: ${cooldownDays} days required`,
          nextEligibleDate: nextEligible,
          cooldownDays,
        };
      }
    }
    if (context.lastContactAt) {
      const daysSince = daysBetween(context.lastContactAt, now);
      if (daysSince < cooldownDays) {
        const nextEligible = addDays(context.lastContactAt, cooldownDays);
        return {
          canContact: false,
          reason: `Bereavement/probate cooldown: ${cooldownDays - daysSince} days remaining`,
          nextEligibleDate: nextEligible,
          cooldownDays,
        };
      }
    }
  }

  if (context.lastContactAt) {
    const channelCooldown = CHANNEL_CONSTRAINTS[context.channel].cooldownDays;
    const daysSince = daysBetween(context.lastContactAt, now);

    if (daysSince < channelCooldown) {
      const nextEligible = addDays(context.lastContactAt, channelCooldown);
      return {
        canContact: false,
        reason: `${context.channel} cooldown: ${channelCooldown - daysSince} days remaining`,
        nextEligibleDate: nextEligible,
        cooldownDays: channelCooldown,
      };
    }
  }

  return {
    canContact: true,
    reason: null,
    nextEligibleDate: null,
    cooldownDays: 0,
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
