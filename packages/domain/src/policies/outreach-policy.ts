import type { SignalType } from "../value-objects/signal-type.js";
import type { OutreachChannel } from "../value-objects/outreach-channel.js";
import { CHANNEL_CONSTRAINTS } from "../value-objects/outreach-channel.js";

export interface OutreachContext {
  signalType: SignalType;
  compositeScore: number;
  hasEmail: boolean;
  hasCellPhone: boolean;
  hasHomeAddress: boolean;
  hasLinkedIn: boolean;
  hasConsent: boolean;
  previousChannelsUsed: OutreachChannel[];
  daysSinceLastContact: number | null;
}

export function determineChannelPriority(context: OutreachContext): OutreachChannel[] {
  const available: OutreachChannel[] = [];

  if (context.hasEmail) available.push("email");
  if (context.hasLinkedIn) available.push("linkedin");
  if (context.hasCellPhone) available.push("voicemail");
  if (context.hasHomeAddress) available.push("handwritten");
  if (context.hasCellPhone && context.hasConsent) available.push("sms");

  const unused = available.filter((ch) => !context.previousChannelsUsed.includes(ch));
  const used = available.filter((ch) => context.previousChannelsUsed.includes(ch));

  return [...unused, ...used];
}

export function selectBestVariant(
  channel: OutreachChannel,
  context: OutreachContext,
): string {
  const isHighValue = [
    "deed_transfer", "sec_form4", "business_dissolution",
    "probate_filing", "court_settlement", "news_liquidity_event",
  ].includes(context.signalType);

  if (channel === "email") {
    if (context.compositeScore >= 80) return "warm-intro";
    if (isHighValue) return "value";
    return "rapport";
  }

  if (channel === "linkedin") return "connection";
  if (channel === "voicemail") return "intro";
  if (channel === "handwritten") return "note";
  if (channel === "sms") return "brief";

  return "default";
}

export function validateOutreachContent(
  channel: OutreachChannel,
  content: string,
): { valid: boolean; issues: string[] } {
  const constraints = CHANNEL_CONSTRAINTS[channel];
  const issues: string[] = [];
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  if (channel === "email" && wordCount > constraints.maxLength) {
    issues.push(`Email exceeds ${constraints.maxLength} word limit (${wordCount} words)`);
  }

  if (channel === "linkedin" && content.length > constraints.maxLength) {
    issues.push(`LinkedIn message exceeds ${constraints.maxLength} character limit`);
  }

  if (channel === "voicemail" && wordCount > constraints.maxLength) {
    issues.push(`Voicemail script exceeds ${constraints.maxLength} word limit`);
  }

  if (channel === "sms" && content.length > constraints.maxLength) {
    issues.push(`SMS exceeds ${constraints.maxLength} character limit`);
  }

  return { valid: issues.length === 0, issues };
}
