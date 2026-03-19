import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

const EVENT_TITLES: Record<string, string> = {
  SignalDetected: "Signal detected",
  SignalValidated: "Signal validated",
  LeadCreated: "Lead created",
  LeadPromoted: "Status changed",
  LeadAssigned: "Assigned to rep",
  LeadSuppressed: "Suppressed",
  EnrichmentCompleted: "Enrichment completed",
  EnrichmentMerged: "Contact data merged",
  LeadScored: "Score calculated",
  LeadRescored: "Score updated",
  RapportExtracted: "Rapport hooks found",
  WarmPathFound: "Warm path discovered",
  CompetitorDetected: "Existing advisor detected",
  DraftGenerated: "Outreach drafted",
  ComplianceReviewed: "Compliance reviewed",
  OutreachSent: "Outreach sent",
  OutreachOpened: "Email opened",
  OutreachReplied: "Reply received",
  OutreachBounced: "Email bounced",
  MeetingBooked: "Meeting scheduled",
  LeadQualified: "Lead qualified",
  LeadConverted: "Converted to client",
  LeadDisqualified: "Disqualified",
  LeadLost: "Lead lost",
  MeetingBriefGenerated: "Meeting brief ready",
  HouseholdFormed: "Household formed",
  HouseholdMemberAdded: "Household member added",
};

export const timelineProjection: Projection = {
  name: "timeline",
  handledEvents: Object.keys(EVENT_TITLES),

  async apply(event: StoredEvent, prisma: PrismaClient): Promise<void> {
    const p = event.payload as Record<string, unknown>;
    const leadId = (p["leadId"] ?? event.aggregateId) as string;
    const title = EVENT_TITLES[event.eventType] ?? event.eventType;

    await prisma.timelineEntry.create({
      data: {
        leadId,
        eventType: event.eventType,
        title,
        description: buildDescription(event),
        metadata: event.payload,
        createdAt: event.createdAt,
      },
    }).catch(() => {
      // Lead may not exist yet
    });
  },
};

function buildDescription(event: StoredEvent): string | null {
  const p = event.payload as Record<string, unknown>;

  switch (event.eventType) {
    case "SignalDetected":
      return `${p["signalType"]} from ${p["source"]}`;
    case "LeadPromoted":
      return `${p["fromStatus"]} → ${p["toStatus"]}`;
    case "LeadAssigned":
      return `Assigned to rep ${p["repId"]}`;
    case "EnrichmentCompleted":
      return `${p["provider"]}: ${(p["fieldsPopulated"] as string[])?.length ?? 0} fields`;
    case "LeadScored":
      return `Score: ${p["compositeScore"]} (Q:${p["qualitativeScore"]} + ML:${p["quantitativeScore"]})`;
    case "OutreachSent":
      return `Via ${p["channel"]}`;
    case "MeetingBooked":
      return `${p["meetingType"]} at ${p["scheduledAt"]}`;
    case "LeadConverted":
      return `AUM: $${Number(BigInt(p["aumCents"] as string || "0")) / 100}`;
    default:
      return null;
  }
}
