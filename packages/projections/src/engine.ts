import type { PrismaClient } from "@prisma/client";
import type { StoredEvent } from "@meridian/event-store";

export interface Projection {
  name: string;
  handledEvents: string[];
  apply(event: StoredEvent, prisma: PrismaClient): Promise<void>;
}

export class ProjectionEngine {
  private projections: Map<string, Projection> = new Map();

  constructor(private readonly prisma: PrismaClient) {}

  register(projection: Projection): void {
    this.projections.set(projection.name, projection);
  }

  async processEvent(event: StoredEvent): Promise<string[]> {
    const applied: string[] = [];

    for (const [name, projection] of this.projections) {
      if (projection.handledEvents.includes(event.eventType)) {
        await projection.apply(event, this.prisma);
        await this.updateCheckpoint(name, event.id, event.createdAt);
        applied.push(name);
      }
    }

    return applied;
  }

  async processBatch(events: StoredEvent[]): Promise<void> {
    for (const event of events) {
      await this.processEvent(event);
    }
  }

  async getCheckpoint(projectionName: string): Promise<string | null> {
    const checkpoint = await this.prisma.projectionCheckpoint.findUnique({
      where: { projectionName },
    });
    return checkpoint?.lastEventId ?? null;
  }

  private async updateCheckpoint(
    projectionName: string,
    eventId: string,
    eventAt: Date,
  ): Promise<void> {
    await this.prisma.projectionCheckpoint.upsert({
      where: { projectionName },
      update: { lastEventId: eventId, lastEventAt: eventAt },
      create: { projectionName, lastEventId: eventId, lastEventAt: eventAt },
    });
  }

  async rebuildProjection(
    projectionName: string,
    readEvents: (fromId: string | undefined, limit: number) => Promise<StoredEvent[]>,
  ): Promise<number> {
    const projection = this.projections.get(projectionName);
    if (!projection) throw new Error(`Unknown projection: ${projectionName}`);

    let processed = 0;
    let lastId: string | undefined;

    while (true) {
      const events = await readEvents(lastId, 100);
      if (events.length === 0) break;

      for (const event of events) {
        if (projection.handledEvents.includes(event.eventType)) {
          await projection.apply(event, this.prisma);
          processed++;
        }
        lastId = event.id;
      }
    }

    return processed;
  }

  getRegisteredProjections(): string[] {
    return Array.from(this.projections.keys());
  }
}
