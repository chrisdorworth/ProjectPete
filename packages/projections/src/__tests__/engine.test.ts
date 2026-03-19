import { describe, it, expect, vi, beforeEach } from "vitest";
import { ProjectionEngine, type Projection } from "../engine.js";
import type { StoredEvent } from "@meridian/event-store";

function makePrisma() {
  return {
    projectionCheckpoint: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
  } as any;
}

function makeEvent(overrides: Partial<StoredEvent> = {}): StoredEvent {
  return {
    id: "evt-001",
    aggregateId: "agg-001",
    aggregateType: "Lead",
    eventType: "LeadCreated",
    version: 1,
    payload: {},
    metadata: {},
    idempotencyKey: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

function makeProjection(
  name: string,
  handledEvents: string[],
  applyFn?: (event: StoredEvent, prisma: any) => Promise<void>,
): Projection {
  return {
    name,
    handledEvents,
    apply: applyFn ?? vi.fn().mockResolvedValue(undefined),
  };
}

describe("ProjectionEngine", () => {
  let prisma: ReturnType<typeof makePrisma>;
  let engine: ProjectionEngine;

  beforeEach(() => {
    prisma = makePrisma();
    engine = new ProjectionEngine(prisma);
  });

  it("registers a projection and lists it", () => {
    const projection = makeProjection("lead-summary", ["LeadCreated"]);
    engine.register(projection);

    expect(engine.getRegisteredProjections()).toEqual(["lead-summary"]);
  });

  it("registers multiple projections", () => {
    engine.register(makeProjection("lead-summary", ["LeadCreated"]));
    engine.register(makeProjection("enrichment-stats", ["EnrichmentCompleted"]));

    expect(engine.getRegisteredProjections()).toEqual(["lead-summary", "enrichment-stats"]);
  });

  it("dispatches event to correct projection handler", async () => {
    const leadProjection = makeProjection("lead-summary", ["LeadCreated", "LeadUpdated"]);
    const enrichProjection = makeProjection("enrichment-stats", ["EnrichmentCompleted"]);

    engine.register(leadProjection);
    engine.register(enrichProjection);

    const event = makeEvent({ eventType: "LeadCreated" });
    const applied = await engine.processEvent(event);

    expect(leadProjection.apply).toHaveBeenCalledWith(event, prisma);
    expect(enrichProjection.apply).not.toHaveBeenCalled();
    expect(applied).toEqual(["lead-summary"]);
  });

  it("dispatches event to multiple matching projections", async () => {
    const projA = makeProjection("proj-a", ["LeadCreated"]);
    const projB = makeProjection("proj-b", ["LeadCreated", "LeadUpdated"]);

    engine.register(projA);
    engine.register(projB);

    const event = makeEvent({ eventType: "LeadCreated" });
    const applied = await engine.processEvent(event);

    expect(projA.apply).toHaveBeenCalledTimes(1);
    expect(projB.apply).toHaveBeenCalledTimes(1);
    expect(applied).toEqual(["proj-a", "proj-b"]);
  });

  it("returns empty array when no projection handles the event", async () => {
    engine.register(makeProjection("lead-summary", ["LeadCreated"]));

    const event = makeEvent({ eventType: "UnknownEvent" });
    const applied = await engine.processEvent(event);

    expect(applied).toEqual([]);
  });

  it("updates checkpoint after applying each projection", async () => {
    const projection = makeProjection("lead-summary", ["LeadCreated"]);
    engine.register(projection);

    const event = makeEvent({ id: "evt-123", createdAt: new Date("2026-03-01T12:00:00Z") });
    await engine.processEvent(event);

    expect(prisma.projectionCheckpoint.upsert).toHaveBeenCalledWith({
      where: { projectionName: "lead-summary" },
      update: { lastEventId: "evt-123", lastEventAt: event.createdAt },
      create: { projectionName: "lead-summary", lastEventId: "evt-123", lastEventAt: event.createdAt },
    });
  });

  it("processes batch of events sequentially", async () => {
    const callOrder: string[] = [];
    const projection = makeProjection("lead-summary", ["LeadCreated", "LeadUpdated"], async (event) => {
      callOrder.push(event.id);
    });
    engine.register(projection);

    const events = [
      makeEvent({ id: "evt-1", eventType: "LeadCreated" }),
      makeEvent({ id: "evt-2", eventType: "LeadUpdated" }),
      makeEvent({ id: "evt-3", eventType: "LeadCreated" }),
    ];

    await engine.processBatch(events);

    expect(callOrder).toEqual(["evt-1", "evt-2", "evt-3"]);
  });

  it("retrieves checkpoint for a projection", async () => {
    prisma.projectionCheckpoint.findUnique.mockResolvedValue({
      projectionName: "lead-summary",
      lastEventId: "evt-050",
      lastEventAt: new Date("2026-02-01"),
    });

    const checkpoint = await engine.getCheckpoint("lead-summary");
    expect(checkpoint).toBe("evt-050");
  });

  it("returns null checkpoint when none exists", async () => {
    prisma.projectionCheckpoint.findUnique.mockResolvedValue(null);

    const checkpoint = await engine.getCheckpoint("nonexistent");
    expect(checkpoint).toBeNull();
  });

  it("rebuilds a projection by reading all events in batches", async () => {
    const applyCalls: string[] = [];
    const projection = makeProjection("lead-summary", ["LeadCreated"], async (event) => {
      applyCalls.push(event.id);
    });
    engine.register(projection);

    const batch1 = [
      makeEvent({ id: "evt-1", eventType: "LeadCreated" }),
      makeEvent({ id: "evt-2", eventType: "LeadCreated" }),
    ];
    const batch2 = [
      makeEvent({ id: "evt-3", eventType: "LeadCreated" }),
    ];

    const readEvents = vi.fn()
      .mockResolvedValueOnce(batch1)
      .mockResolvedValueOnce(batch2)
      .mockResolvedValueOnce([]); // end

    const count = await engine.rebuildProjection("lead-summary", readEvents);

    expect(count).toBe(3);
    expect(applyCalls).toEqual(["evt-1", "evt-2", "evt-3"]);
    expect(readEvents).toHaveBeenCalledTimes(3);
    // First call with undefined, subsequent calls with last event ID
    expect(readEvents).toHaveBeenNthCalledWith(1, undefined, 100);
    expect(readEvents).toHaveBeenNthCalledWith(2, "evt-2", 100);
    expect(readEvents).toHaveBeenNthCalledWith(3, "evt-3", 100);
  });

  it("throws when rebuilding unknown projection", async () => {
    const readEvents = vi.fn();

    await expect(
      engine.rebuildProjection("nonexistent", readEvents),
    ).rejects.toThrow("Unknown projection: nonexistent");
  });

  it("rebuild skips events not in handledEvents", async () => {
    const applyCalls: string[] = [];
    const projection = makeProjection("lead-summary", ["LeadCreated"], async (event) => {
      applyCalls.push(event.id);
    });
    engine.register(projection);

    const events = [
      makeEvent({ id: "evt-1", eventType: "LeadCreated" }),
      makeEvent({ id: "evt-2", eventType: "EnrichmentCompleted" }), // not handled
      makeEvent({ id: "evt-3", eventType: "LeadCreated" }),
    ];

    const readEvents = vi.fn()
      .mockResolvedValueOnce(events)
      .mockResolvedValueOnce([]);

    const count = await engine.rebuildProjection("lead-summary", readEvents);

    expect(count).toBe(2); // only LeadCreated events
    expect(applyCalls).toEqual(["evt-1", "evt-3"]);
  });
});
