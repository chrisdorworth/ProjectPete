import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

export const leadProjection: Projection = {
  name: "lead",
  handledEvents: [
    "LeadCreated", "LeadPromoted", "LeadAssigned", "LeadSuppressed", "LeadPurged",
    "LeadMerged", "SignalLinked",
    "EnrichmentMerged",
    "LeadScored", "LeadRescored", "ScoreOverridden",
    "RapportExtracted", "WarmPathFound", "CompetitorDetected",
    "MeetingBooked", "LeadQualified", "LeadConverted", "LeadDisqualified", "LeadLost",
    "OutreachSent",
  ],

  async apply(event: StoredEvent, prisma: PrismaClient): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.eventType) {
      case "LeadCreated":
        await prisma.lead.create({
          data: {
            id: p["leadId"] as string,
            status: "new",
            firstName: p["firstName"] as string | null,
            lastName: p["lastName"] as string | null,
            fullName: p["fullName"] as string | null,
            company: p["company"] as string | null,
            title: p["title"] as string | null,
            county: p["county"] as string | null,
            state: p["state"] as string | null,
            estimatedValueCents: BigInt(p["estimatedValueCents"] as string || "0"),
            firstSignalAt: event.createdAt,
            lastSignalAt: event.createdAt,
          },
        });
        await prisma.timelineEntry.create({
          data: {
            leadId: p["leadId"] as string,
            eventType: "LeadCreated",
            title: "Lead created",
            description: `New lead from signal`,
            metadata: event.payload,
          },
        });
        break;

      case "LeadPromoted":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: { status: p["toStatus"] as string },
        });
        await prisma.timelineEntry.create({
          data: {
            leadId: p["leadId"] as string,
            eventType: "LeadPromoted",
            title: `Status: ${p["toStatus"]}`,
            description: p["reason"] as string,
          },
        });
        break;

      case "LeadAssigned":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            assignedRepId: p["repId"] as string,
            territoryId: p["territoryId"] as string | null,
          },
        });
        break;

      case "LeadSuppressed":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            status: "suppressed",
            isSuppressed: true,
            suppressionReason: p["reason"] as string,
            suppressedAt: event.createdAt,
          },
        });
        break;

      case "LeadPurged":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            firstName: null, lastName: null, fullName: null,
            email: null, phone: null, cellPhone: null,
            homeAddress: null, linkedinUrl: null,
            company: null, title: null, summary: null,
            rapportHooks: null, warmPaths: null,
            purgedAt: event.createdAt,
          },
        });
        break;

      case "EnrichmentMerged":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            enrichmentStatus: "completed",
            enrichmentCompleteness: p["completeness"] as number,
            lastEnrichedAt: event.createdAt,
          },
        });
        break;

      case "LeadScored":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            compositeScore: p["compositeScore"] as number,
            qualitativeScore: p["qualitativeScore"] as number,
            quantitativeScore: p["quantitativeScore"] as number,
            scoreBreakdown: p["breakdown"] as object,
            scoredAt: event.createdAt,
          },
        });
        break;

      case "LeadRescored":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            compositeScore: p["newScore"] as number,
            scoreBreakdown: p["breakdown"] as object,
            scoredAt: event.createdAt,
          },
        });
        break;

      case "ScoreOverridden":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            compositeScore: p["newScore"] as number,
            scoredAt: event.createdAt,
          },
        });
        break;

      case "RapportExtracted":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            rapportHooks: p["hooks"] as object,
            rapportHookCount: p["hookCount"] as number,
          },
        });
        break;

      case "WarmPathFound":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: {
            hasWarmPath: ((p["paths"] as unknown[]) ?? []).length > 0,
            warmPaths: p["paths"] as object,
          },
        });
        break;

      case "CompetitorDetected":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: { competitorDetected: true },
        });
        break;

      case "MeetingBooked":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: { status: "meeting_booked" },
        });
        await prisma.timelineEntry.create({
          data: {
            leadId: p["leadId"] as string,
            eventType: "MeetingBooked",
            title: "Meeting booked",
            description: `Scheduled: ${p["scheduledAt"]}`,
          },
        });
        break;

      case "LeadConverted":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: { status: "converted" },
        });
        await prisma.disposition.create({
          data: {
            leadId: p["leadId"] as string,
            type: "converted",
            aumCents: BigInt(p["aumCents"] as string || "0"),
            repId: p["repId"] as string,
            notes: p["notes"] as string | null,
          },
        });
        break;

      case "LeadDisqualified":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: { status: "disqualified" },
        });
        await prisma.disposition.create({
          data: {
            leadId: p["leadId"] as string,
            type: "disqualified",
            reason: p["reason"] as string,
            repId: p["repId"] as string | null,
          },
        });
        break;

      case "LeadLost":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: { status: "lost" },
        });
        await prisma.disposition.create({
          data: {
            leadId: p["leadId"] as string,
            type: "lost",
            reason: p["reason"] as string,
            repId: p["repId"] as string | null,
          },
        });
        break;

      case "OutreachSent":
        await prisma.lead.update({
          where: { id: p["leadId"] as string },
          data: { lastContactAt: event.createdAt },
        });
        break;
    }
  },
};
