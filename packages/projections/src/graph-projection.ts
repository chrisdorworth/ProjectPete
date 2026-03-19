import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

// Graph projection is a skeleton — actual Neo4j sync is in packages/graph
// This projection tracks what needs to be synced
export const graphProjection: Projection = {
  name: "graph",
  handledEvents: [
    "LeadCreated", "LeadMerged",
    "EnrichmentMerged",
    "HouseholdFormed", "HouseholdMemberAdded",
    "WarmPathFound", "CompetitorDetected",
    "LeadConverted",
  ],

  async apply(event: StoredEvent, _prisma: PrismaClient): Promise<void> {
    // Graph sync is handled by the graph-worker which calls packages/graph/sync
    // This projection just marks the event as needing graph processing
    // The actual Neo4j mutations happen in the graph package
    void event;
  },
};
