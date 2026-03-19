import { describe, it, expect } from "vitest";
import {
  createInitialOutreachState,
  applyOutreachEvent,
  hydrateOutreachFromEvents,
  canSendOutreach,
} from "../aggregates/outreach-aggregate.js";
import type {
  MeridianEvent,
  DraftGenerated,
  ComplianceReviewed,
  OutreachQueued,
  OutreachSent,
  OutreachDelivered,
  OutreachOpened,
  OutreachReplied,
  OutreachBounced,
  OutreachUnsubscribed,
} from "../events/index.js";

function makeEvent<T extends MeridianEvent>(
  partial: Omit<T, "id" | "version" | "timestamp" | "metadata"> &
    Partial<Pick<T, "id" | "version" | "timestamp" | "metadata">>,
): T {
  return {
    id: "evt-1",
    version: 1,
    timestamp: new Date("2025-01-15"),
    metadata: {},
    ...partial,
  } as T;
}

function buildDraftEvent(version = 1): DraftGenerated {
  return makeEvent<DraftGenerated>({
    type: "DraftGenerated",
    aggregateId: "outreach-1",
    version,
    payload: {
      leadId: "lead-1",
      channel: "email",
      variant: "rapport",
      content: "Hi John, I noticed your recent property transaction...",
      promptVersion: "v1.2",
      wordCount: 42,
    },
  });
}

function buildComplianceApproved(version = 2): ComplianceReviewed {
  return makeEvent<ComplianceReviewed>({
    type: "ComplianceReviewed",
    aggregateId: "outreach-1",
    version,
    payload: {
      outreachId: "outreach-1",
      leadId: "lead-1",
      channel: "email",
      status: "approved",
      checks: [{ rule: "CAN-SPAM", passed: true, note: null }],
      reviewedBy: "auto",
    },
  });
}

function buildQueuedEvent(version = 3): OutreachQueued {
  return makeEvent<OutreachQueued>({
    type: "OutreachQueued",
    aggregateId: "outreach-1",
    version,
    payload: {
      outreachId: "outreach-1",
      leadId: "lead-1",
      channel: "email",
      scheduledFor: null,
      priority: 80,
    },
  });
}

function buildSentEvent(version = 4): OutreachSent {
  return makeEvent<OutreachSent>({
    type: "OutreachSent",
    aggregateId: "outreach-1",
    version,
    timestamp: new Date("2025-01-15T10:00:00Z"),
    payload: {
      outreachId: "outreach-1",
      leadId: "lead-1",
      channel: "email",
      externalMessageId: "msg-ext-123",
      costCents: 1,
    },
  });
}

function buildDeliveredEvent(version = 5): OutreachDelivered {
  return makeEvent<OutreachDelivered>({
    type: "OutreachDelivered",
    aggregateId: "outreach-1",
    version,
    timestamp: new Date("2025-01-15T10:01:00Z"),
    payload: {
      outreachId: "outreach-1",
      leadId: "lead-1",
      channel: "email",
    },
  });
}

function buildOpenedEvent(version = 6): OutreachOpened {
  return makeEvent<OutreachOpened>({
    type: "OutreachOpened",
    aggregateId: "outreach-1",
    version,
    timestamp: new Date("2025-01-15T12:00:00Z"),
    payload: {
      outreachId: "outreach-1",
      leadId: "lead-1",
      openedAt: "2025-01-15T12:00:00Z",
      userAgent: "Mozilla/5.0",
    },
  });
}

describe("OutreachAggregate", () => {
  describe("createInitialOutreachState", () => {
    it("returns blank initial state", () => {
      const state = createInitialOutreachState();
      expect(state.id).toBe("");
      expect(state.leadId).toBe("");
      expect(state.channel).toBe("email");
      expect(state.status).toBe("draft");
      expect(state.draftContent).toBeNull();
      expect(state.complianceStatus).toBe("pending");
      expect(state.sentAt).toBeNull();
      expect(state.deliveredAt).toBeNull();
      expect(state.openedAt).toBeNull();
      expect(state.repliedAt).toBeNull();
      expect(state.bouncedAt).toBeNull();
      expect(state.externalMessageId).toBeNull();
      expect(state.version).toBe(0);
    });
  });

  describe("full outreach lifecycle", () => {
    it("progresses draft -> compliance -> queue -> send -> delivered -> opened", () => {
      const events: MeridianEvent[] = [
        buildDraftEvent(1),
        buildComplianceApproved(2),
        buildQueuedEvent(3),
        buildSentEvent(4),
        buildDeliveredEvent(5),
        buildOpenedEvent(6),
      ];

      const state = hydrateOutreachFromEvents(events);
      expect(state.status).toBe("opened");
      expect(state.leadId).toBe("lead-1");
      expect(state.channel).toBe("email");
      expect(state.draftContent).toBe("Hi John, I noticed your recent property transaction...");
      expect(state.complianceStatus).toBe("approved");
      expect(state.sentAt).toEqual(new Date("2025-01-15T10:00:00Z"));
      expect(state.deliveredAt).toEqual(new Date("2025-01-15T10:01:00Z"));
      expect(state.openedAt).toEqual(new Date("2025-01-15T12:00:00Z"));
      expect(state.externalMessageId).toBe("msg-ext-123");
      expect(state.version).toBe(6);
    });
  });

  describe("compliance flagged flow", () => {
    it("sets status to compliance_flagged when flagged", () => {
      const flagged = makeEvent<ComplianceReviewed>({
        type: "ComplianceReviewed",
        aggregateId: "outreach-1",
        version: 2,
        payload: {
          outreachId: "outreach-1",
          leadId: "lead-1",
          channel: "email",
          status: "flagged",
          checks: [{ rule: "FINRA-2210", passed: false, note: "Performance claims detected" }],
          reviewedBy: "auto",
        },
      });

      const state = hydrateOutreachFromEvents([buildDraftEvent(1), flagged]);
      expect(state.status).toBe("compliance_flagged");
      expect(state.complianceStatus).toBe("flagged");
    });

    it("sets status to compliance_flagged when rejected", () => {
      const rejected = makeEvent<ComplianceReviewed>({
        type: "ComplianceReviewed",
        aggregateId: "outreach-1",
        version: 2,
        payload: {
          outreachId: "outreach-1",
          leadId: "lead-1",
          channel: "email",
          status: "rejected",
          checks: [{ rule: "CAN-SPAM", passed: false, note: "Missing unsubscribe" }],
          reviewedBy: "auto",
        },
      });

      const state = hydrateOutreachFromEvents([buildDraftEvent(1), rejected]);
      expect(state.status).toBe("compliance_flagged");
      expect(state.complianceStatus).toBe("rejected");
    });
  });

  describe("bounce handling", () => {
    it("sets bounced status and bouncedAt timestamp", () => {
      const bounced = makeEvent<OutreachBounced>({
        type: "OutreachBounced",
        aggregateId: "outreach-1",
        version: 5,
        timestamp: new Date("2025-01-15T10:05:00Z"),
        payload: {
          outreachId: "outreach-1",
          leadId: "lead-1",
          bounceType: "hard",
          bounceReason: "Mailbox does not exist",
        },
      });

      const events: MeridianEvent[] = [
        buildDraftEvent(1),
        buildComplianceApproved(2),
        buildQueuedEvent(3),
        buildSentEvent(4),
        bounced,
      ];

      const state = hydrateOutreachFromEvents(events);
      expect(state.status).toBe("bounced");
      expect(state.bouncedAt).toEqual(new Date("2025-01-15T10:05:00Z"));
      expect(state.version).toBe(5);
    });
  });

  describe("canSendOutreach", () => {
    it("allows sending when compliance-approved and queued", () => {
      const state = hydrateOutreachFromEvents([
        buildDraftEvent(1),
        buildComplianceApproved(2),
        buildQueuedEvent(3),
      ]);

      const result = canSendOutreach(state);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("allows sending when compliance-approved (before queuing)", () => {
      const state = hydrateOutreachFromEvents([
        buildDraftEvent(1),
        buildComplianceApproved(2),
      ]);

      const result = canSendOutreach(state);
      expect(result.allowed).toBe(true);
    });

    it("rejects sending when compliance is pending", () => {
      const state = hydrateOutreachFromEvents([buildDraftEvent(1)]);

      const result = canSendOutreach(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Outreach not compliance-approved");
    });

    it("rejects sending when compliance is flagged", () => {
      const flagged = makeEvent<ComplianceReviewed>({
        type: "ComplianceReviewed",
        aggregateId: "outreach-1",
        version: 2,
        payload: {
          outreachId: "outreach-1",
          leadId: "lead-1",
          channel: "email",
          status: "flagged",
          checks: [],
          reviewedBy: "auto",
        },
      });

      const state = hydrateOutreachFromEvents([buildDraftEvent(1), flagged]);
      const result = canSendOutreach(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Outreach not compliance-approved");
    });

    it("rejects sending when already sent", () => {
      const state = hydrateOutreachFromEvents([
        buildDraftEvent(1),
        buildComplianceApproved(2),
        buildQueuedEvent(3),
        buildSentEvent(4),
      ]);

      const result = canSendOutreach(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Invalid status for send: sent");
    });

    it("rejects sending when already delivered", () => {
      const state = hydrateOutreachFromEvents([
        buildDraftEvent(1),
        buildComplianceApproved(2),
        buildQueuedEvent(3),
        buildSentEvent(4),
        buildDeliveredEvent(5),
      ]);

      const result = canSendOutreach(state);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("Invalid status for send: delivered");
    });
  });

  describe("reply handling", () => {
    it("sets replied status and repliedAt timestamp", () => {
      const replied = makeEvent<OutreachReplied>({
        type: "OutreachReplied",
        aggregateId: "outreach-1",
        version: 7,
        timestamp: new Date("2025-01-16T09:00:00Z"),
        payload: {
          outreachId: "outreach-1",
          leadId: "lead-1",
          repliedAt: "2025-01-16T09:00:00Z",
          sentiment: "positive",
        },
      });

      const events: MeridianEvent[] = [
        buildDraftEvent(1),
        buildComplianceApproved(2),
        buildQueuedEvent(3),
        buildSentEvent(4),
        buildDeliveredEvent(5),
        buildOpenedEvent(6),
        replied,
      ];

      const state = hydrateOutreachFromEvents(events);
      expect(state.status).toBe("replied");
      expect(state.repliedAt).toEqual(new Date("2025-01-16T09:00:00Z"));
      expect(state.version).toBe(7);
    });
  });

  describe("unsubscribe handling", () => {
    it("sets unsubscribed status", () => {
      const unsub = makeEvent<OutreachUnsubscribed>({
        type: "OutreachUnsubscribed",
        aggregateId: "outreach-1",
        version: 7,
        payload: {
          outreachId: "outreach-1",
          leadId: "lead-1",
          channel: "email",
        },
      });

      const events: MeridianEvent[] = [
        buildDraftEvent(1),
        buildComplianceApproved(2),
        buildQueuedEvent(3),
        buildSentEvent(4),
        buildDeliveredEvent(5),
        buildOpenedEvent(6),
        unsub,
      ];

      const state = hydrateOutreachFromEvents(events);
      expect(state.status).toBe("unsubscribed");
      expect(state.version).toBe(7);
    });
  });

  describe("unknown events", () => {
    it("ignores unrecognized event types", () => {
      const unknown = {
        id: "evt-99",
        aggregateId: "outreach-1",
        type: "SomeUnknownEvent",
        version: 2,
        timestamp: new Date(),
        metadata: {},
        payload: {},
      } as unknown as MeridianEvent;

      const state = hydrateOutreachFromEvents([buildDraftEvent(1), unknown]);
      expect(state.status).toBe("draft");
      expect(state.version).toBe(1);
    });
  });

  describe("DraftGenerated event", () => {
    it("sets leadId, channel, content, and variant from draft", () => {
      const draft = makeEvent<DraftGenerated>({
        type: "DraftGenerated",
        aggregateId: "outreach-1",
        version: 1,
        payload: {
          leadId: "lead-42",
          channel: "linkedin",
          variant: "connection",
          content: "Hello, I'd love to connect...",
          promptVersion: "v2.0",
          wordCount: 8,
        },
      });

      const state = applyOutreachEvent(createInitialOutreachState(), draft);
      expect(state.leadId).toBe("lead-42");
      expect(state.channel).toBe("linkedin");
      expect(state.draftContent).toBe("Hello, I'd love to connect...");
      expect(state.variant).toBe("connection");
      expect(state.status).toBe("draft");
    });
  });
});
