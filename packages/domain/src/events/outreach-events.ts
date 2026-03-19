import type { OutreachChannel } from "../value-objects/outreach-channel.js";

interface BaseEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export interface DraftGenerated extends BaseEvent {
  readonly type: "DraftGenerated";
  readonly payload: {
    leadId: string;
    channel: OutreachChannel;
    variant: string;
    content: string;
    promptVersion: string;
    wordCount: number;
  };
}

export interface ComplianceReviewed extends BaseEvent {
  readonly type: "ComplianceReviewed";
  readonly payload: {
    outreachId: string;
    leadId: string;
    channel: OutreachChannel;
    status: "approved" | "flagged" | "rejected";
    checks: Array<{
      rule: string;
      passed: boolean;
      note: string | null;
    }>;
    reviewedBy: "auto" | string;
  };
}

export interface OutreachQueued extends BaseEvent {
  readonly type: "OutreachQueued";
  readonly payload: {
    outreachId: string;
    leadId: string;
    channel: OutreachChannel;
    scheduledFor: string | null;
    priority: number;
  };
}

export interface OutreachSent extends BaseEvent {
  readonly type: "OutreachSent";
  readonly payload: {
    outreachId: string;
    leadId: string;
    channel: OutreachChannel;
    externalMessageId: string | null;
    costCents: number;
  };
}

export interface OutreachDelivered extends BaseEvent {
  readonly type: "OutreachDelivered";
  readonly payload: {
    outreachId: string;
    leadId: string;
    channel: OutreachChannel;
  };
}

export interface OutreachOpened extends BaseEvent {
  readonly type: "OutreachOpened";
  readonly payload: {
    outreachId: string;
    leadId: string;
    openedAt: string;
    userAgent: string | null;
  };
}

export interface OutreachClicked extends BaseEvent {
  readonly type: "OutreachClicked";
  readonly payload: {
    outreachId: string;
    leadId: string;
    url: string;
    clickedAt: string;
  };
}

export interface OutreachReplied extends BaseEvent {
  readonly type: "OutreachReplied";
  readonly payload: {
    outreachId: string;
    leadId: string;
    repliedAt: string;
    sentiment: "positive" | "neutral" | "negative" | null;
  };
}

export interface OutreachBounced extends BaseEvent {
  readonly type: "OutreachBounced";
  readonly payload: {
    outreachId: string;
    leadId: string;
    bounceType: "hard" | "soft";
    bounceReason: string;
  };
}

export interface OutreachUnsubscribed extends BaseEvent {
  readonly type: "OutreachUnsubscribed";
  readonly payload: {
    outreachId: string;
    leadId: string;
    channel: OutreachChannel;
  };
}
