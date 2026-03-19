import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

export const analyticsProjection: Projection = {
  name: "analytics",
  handledEvents: [
    "SignalDetected", "SignalValidated",
    "LeadCreated", "LeadScored",
    "OutreachSent", "OutreachOpened", "OutreachReplied", "OutreachBounced",
    "MeetingBooked", "LeadConverted", "LeadDisqualified", "LeadLost",
  ],

  async apply(event: StoredEvent, prisma: PrismaClient): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    await prisma.timelineEntry.create({
      data: {
        leadId: (p["leadId"] ?? p["aggregateId"] ?? event.aggregateId) as string,
        eventType: event.eventType,
        title: event.eventType.replace(/([A-Z])/g, " $1").trim(),
        description: null,
        metadata: event.payload,
        createdAt: event.createdAt,
      },
    }).catch(() => {
      // Lead may not exist yet for signal events
    });
  },
};
