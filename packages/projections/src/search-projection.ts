import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";
import type { Projection } from "./engine.js";

// pgvector semantic search projection
// Embeds lead data for similarity search
export const searchProjection: Projection = {
  name: "search",
  handledEvents: ["LeadCreated", "EnrichmentMerged", "LeadScored"],

  async apply(event: StoredEvent, _prisma: PrismaClient): Promise<void> {
    // pgvector embedding generation will be implemented when the
    // embedding model integration is added. For now this is a
    // placeholder that the search-projection worker will handle.
    void event;
  },
};
