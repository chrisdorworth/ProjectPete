import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

export const featureProjection: Projection = {
  name: "feature",
  handledEvents: [
    "LeadCreated", "SignalLinked", "EnrichmentMerged", "LeadScored",
    "RapportExtracted", "WarmPathFound", "IntentDetected",
    "HouseholdFormed", "HouseholdMemberAdded", "HouseholdValueUpdated",
    "LeadConverted", "LeadDisqualified", "LeadLost",
  ],

  async apply(event: StoredEvent, prisma: PrismaClient): Promise<void> {
    const p = event.payload as Record<string, unknown>;
    const leadId = (p["leadId"] ?? event.aggregateId) as string;

    switch (event.eventType) {
      case "LeadCreated":
        await prisma.featureRow.create({
          data: {
            leadId,
            signalCount: 1,
            signalTypePrimary: null,
            signalValueCents: BigInt(p["estimatedValueCents"] as string || "0"),
          },
        });
        break;

      case "SignalLinked":
        await prisma.featureRow.update({
          where: { leadId },
          data: {
            signalCount: { increment: 1 },
            multiSignalFlag: true,
          },
        }).catch(() => {});
        break;

      case "EnrichmentMerged":
        await prisma.featureRow.update({
          where: { leadId },
          data: {
            enrichmentCompleteness: p["completeness"] as number,
          },
        }).catch(() => {});
        break;

      case "RapportExtracted":
        await prisma.featureRow.update({
          where: { leadId },
          data: {
            rapportHookCount: p["hookCount"] as number,
          },
        }).catch(() => {});
        break;

      case "WarmPathFound":
        await prisma.featureRow.update({
          where: { leadId },
          data: {
            hasWarmPath: ((p["paths"] as unknown[]) ?? []).length > 0,
          },
        }).catch(() => {});
        break;

      case "IntentDetected":
        await prisma.featureRow.update({
          where: { leadId },
          data: {
            intentScore: p["intentScore"] as number,
            intentKeywordMatch: p["matchesSignalType"] as boolean,
          },
        }).catch(() => {});
        break;

      case "LeadConverted":
        await prisma.featureRow.update({
          where: { leadId },
          data: { outcome: "converted", outcomeCapturedAt: event.createdAt },
        }).catch(() => {});
        break;

      case "LeadDisqualified":
        await prisma.featureRow.update({
          where: { leadId },
          data: { outcome: "disqualified", outcomeCapturedAt: event.createdAt },
        }).catch(() => {});
        break;

      case "LeadLost":
        await prisma.featureRow.update({
          where: { leadId },
          data: { outcome: "lost", outcomeCapturedAt: event.createdAt },
        }).catch(() => {});
        break;
    }
  },
};
