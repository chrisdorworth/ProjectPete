import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

export const householdProjection: Projection = {
  name: "household",
  handledEvents: ["HouseholdFormed", "HouseholdMemberAdded", "HouseholdValueUpdated"],

  async apply(event: StoredEvent, prisma: PrismaClient): Promise<void> {
    const p = event.payload as Record<string, unknown>;

    switch (event.eventType) {
      case "HouseholdFormed": {
        const householdId = p["householdId"] as string;
        const memberIds = p["memberLeadIds"] as string[];

        await prisma.household.create({
          data: {
            id: householdId,
            address: p["address"] as string | null,
            county: p["county"] as string | null,
            memberCount: memberIds.length,
          },
        });

        for (const leadId of memberIds) {
          await prisma.lead.update({
            where: { id: leadId },
            data: { householdId },
          });
        }
        break;
      }

      case "HouseholdMemberAdded": {
        const householdId = p["householdId"] as string;
        const leadId = p["leadId"] as string;

        await prisma.lead.update({
          where: { id: leadId },
          data: { householdId },
        });

        await prisma.household.update({
          where: { id: householdId },
          data: { memberCount: { increment: 1 } },
        });
        break;
      }

      case "HouseholdValueUpdated": {
        await prisma.household.update({
          where: { id: p["householdId"] as string },
          data: {
            combinedValueCents: BigInt(p["newValueCents"] as string || "0"),
            memberCount: p["memberCount"] as number,
          },
        });
        break;
      }
    }
  },
};
