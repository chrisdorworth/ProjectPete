import type { OutreachChannel } from "../value-objects/outreach-channel.js";
import type { MeridianEvent } from "../events/index.js";

export type OutreachStatus =
  | "draft"
  | "compliance_pending"
  | "compliance_approved"
  | "compliance_flagged"
  | "queued"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "replied"
  | "bounced"
  | "unsubscribed";

export interface OutreachState {
  id: string;
  leadId: string;
  channel: OutreachChannel;
  status: OutreachStatus;
  draftContent: string | null;
  variant: string | null;
  complianceStatus: "pending" | "approved" | "flagged" | "rejected";
  sentAt: Date | null;
  deliveredAt: Date | null;
  openedAt: Date | null;
  repliedAt: Date | null;
  bouncedAt: Date | null;
  externalMessageId: string | null;
  version: number;
}

export function createInitialOutreachState(): OutreachState {
  return {
    id: "",
    leadId: "",
    channel: "email",
    status: "draft",
    draftContent: null,
    variant: null,
    complianceStatus: "pending",
    sentAt: null,
    deliveredAt: null,
    openedAt: null,
    repliedAt: null,
    bouncedAt: null,
    externalMessageId: null,
    version: 0,
  };
}

export function applyOutreachEvent(
  state: OutreachState,
  event: MeridianEvent,
): OutreachState {
  switch (event.type) {
    case "DraftGenerated":
      return {
        ...state,
        leadId: event.payload.leadId,
        channel: event.payload.channel,
        status: "draft",
        draftContent: event.payload.content,
        variant: event.payload.variant,
        version: event.version,
      };

    case "ComplianceReviewed":
      return {
        ...state,
        complianceStatus: event.payload.status === "approved" ? "approved" : event.payload.status === "flagged" ? "flagged" : "rejected",
        status: event.payload.status === "approved" ? "compliance_approved" : "compliance_flagged",
        version: event.version,
      };

    case "OutreachQueued":
      return {
        ...state,
        status: "queued",
        version: event.version,
      };

    case "OutreachSent":
      return {
        ...state,
        status: "sent",
        sentAt: event.timestamp,
        externalMessageId: event.payload.externalMessageId,
        version: event.version,
      };

    case "OutreachDelivered":
      return {
        ...state,
        status: "delivered",
        deliveredAt: event.timestamp,
        version: event.version,
      };

    case "OutreachOpened":
      return {
        ...state,
        status: "opened",
        openedAt: event.timestamp,
        version: event.version,
      };

    case "OutreachClicked":
      return {
        ...state,
        status: "clicked",
        version: event.version,
      };

    case "OutreachReplied":
      return {
        ...state,
        status: "replied",
        repliedAt: event.timestamp,
        version: event.version,
      };

    case "OutreachBounced":
      return {
        ...state,
        status: "bounced",
        bouncedAt: event.timestamp,
        version: event.version,
      };

    case "OutreachUnsubscribed":
      return {
        ...state,
        status: "unsubscribed",
        version: event.version,
      };

    default:
      return state;
  }
}

export function hydrateOutreachFromEvents(events: MeridianEvent[]): OutreachState {
  return events.reduce(applyOutreachEvent, createInitialOutreachState());
}

export function canSendOutreach(state: OutreachState): { allowed: boolean; reason?: string } {
  if (state.complianceStatus !== "approved") {
    return { allowed: false, reason: "Outreach not compliance-approved" };
  }
  if (state.status !== "queued" && state.status !== "compliance_approved") {
    return { allowed: false, reason: `Invalid status for send: ${state.status}` };
  }
  return { allowed: true };
}
