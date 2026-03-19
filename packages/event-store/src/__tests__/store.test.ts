import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventStore, ConcurrencyError } from "../store.js";
import type { AppendEventInput, StoredEvent } from "../store.js";

function createMockPrisma() {
  const mock = {
    event: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // By default, $transaction executes the callback with the mock itself as the tx client
  mock.$transaction.mockImplementation(async (fn: (tx: typeof mock) => Promise<unknown>) => {
    return fn(mock);
  });
  return mock;
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

describe("EventStore", () => {
  let prisma: MockPrisma;
  let store: EventStore;

  beforeEach(() => {
    prisma = createMockPrisma();
    store = new EventStore(prisma as any);
  });

  describe("append", () => {
    it("stores events with correct version", async () => {
      prisma.event.findFirst.mockResolvedValue(null); // no existing events
      prisma.event.create.mockResolvedValue({
        id: "evt-1",
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        version: 1,
        payload: { leadId: "lead-1" },
        metadata: {},
        idempotencyKey: null,
        createdAt: new Date("2025-01-15"),
      });

      const input: AppendEventInput = {
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        payload: { leadId: "lead-1" },
      };

      const result = await store.append(input);
      expect(result.version).toBe(1);
      expect(result.aggregateId).toBe("agg-1");
      expect(result.eventType).toBe("LeadCreated");
      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            aggregateId: "agg-1",
            version: 1,
            eventType: "LeadCreated",
          }),
        }),
      );
    });

    it("increments version from existing latest", async () => {
      prisma.event.findFirst.mockResolvedValue({ version: 3 });
      prisma.event.create.mockResolvedValue({
        id: "evt-4",
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadScored",
        version: 4,
        payload: {},
        metadata: {},
        idempotencyKey: null,
        createdAt: new Date(),
      });

      const result = await store.append({
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadScored",
        payload: {},
      });

      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ version: 4 }),
        }),
      );
      expect(result.version).toBe(4);
    });

    it("rejects duplicate idempotency keys by returning existing event", async () => {
      const existingEvent = {
        id: "evt-1",
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        version: 1,
        payload: { leadId: "lead-1" },
        metadata: {},
        idempotencyKey: "idem-key-1",
        createdAt: new Date("2025-01-15"),
      };
      prisma.event.findUnique.mockResolvedValue(existingEvent);

      const result = await store.append({
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        payload: { leadId: "lead-1" },
        idempotencyKey: "idem-key-1",
      });

      expect(result.id).toBe("evt-1");
      expect(result.idempotencyKey).toBe("idem-key-1");
      expect(prisma.event.create).not.toHaveBeenCalled();
    });

    it("throws ConcurrencyError on version conflict", async () => {
      prisma.event.findFirst.mockResolvedValue({ version: 5 });

      await expect(
        store.append({
          aggregateId: "agg-1",
          aggregateType: "Lead",
          eventType: "LeadScored",
          payload: {},
          expectedVersion: 3,
        }),
      ).rejects.toThrow(ConcurrencyError);

      await expect(
        store.append({
          aggregateId: "agg-1",
          aggregateType: "Lead",
          eventType: "LeadScored",
          payload: {},
          expectedVersion: 3,
        }),
      ).rejects.toThrow("Expected version 3 but found 5");
    });

    it("passes expectedVersion check when versions match", async () => {
      prisma.event.findFirst.mockResolvedValue({ version: 5 });
      prisma.event.create.mockResolvedValue({
        id: "evt-6",
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadScored",
        version: 6,
        payload: {},
        metadata: {},
        idempotencyKey: null,
        createdAt: new Date(),
      });

      const result = await store.append({
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadScored",
        payload: {},
        expectedVersion: 5,
      });

      expect(result.version).toBe(6);
    });

    it("stores metadata when provided", async () => {
      prisma.event.findFirst.mockResolvedValue(null);
      prisma.event.create.mockResolvedValue({
        id: "evt-1",
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        version: 1,
        payload: {},
        metadata: { userId: "user-1", correlationId: "corr-1" },
        idempotencyKey: null,
        createdAt: new Date(),
      });

      await store.append({
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        payload: {},
        metadata: { userId: "user-1", correlationId: "corr-1" },
      });

      expect(prisma.event.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: { userId: "user-1", correlationId: "corr-1" },
          }),
        }),
      );
    });
  });

  describe("readStream", () => {
    it("returns events in version order", async () => {
      const mockEvents = [
        {
          id: "evt-1",
          aggregateId: "agg-1",
          aggregateType: "Lead",
          eventType: "LeadCreated",
          version: 1,
          payload: {},
          metadata: {},
          idempotencyKey: null,
          createdAt: new Date("2025-01-15"),
        },
        {
          id: "evt-2",
          aggregateId: "agg-1",
          aggregateType: "Lead",
          eventType: "LeadScored",
          version: 2,
          payload: {},
          metadata: {},
          idempotencyKey: null,
          createdAt: new Date("2025-01-16"),
        },
      ];
      prisma.event.findMany.mockResolvedValue(mockEvents);

      const events = await store.readStream("agg-1");
      expect(events).toHaveLength(2);
      expect(events[0].version).toBe(1);
      expect(events[1].version).toBe(2);
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { aggregateId: "agg-1", version: { gt: 0 } },
        orderBy: { version: "asc" },
      });
    });

    it("supports fromVersion parameter", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      await store.readStream("agg-1", 3);
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { aggregateId: "agg-1", version: { gt: 3 } },
        orderBy: { version: "asc" },
      });
    });

    it("returns empty array when no events exist", async () => {
      prisma.event.findMany.mockResolvedValue([]);

      const events = await store.readStream("nonexistent");
      expect(events).toEqual([]);
    });
  });

  describe("appendBatch", () => {
    it("appends multiple events in sequence", async () => {
      let callCount = 0;
      prisma.event.findFirst.mockImplementation(async () => {
        return callCount > 0 ? { version: callCount } : null;
      });
      prisma.event.create.mockImplementation(async ({ data }) => {
        callCount++;
        return {
          id: `evt-${callCount}`,
          aggregateId: data.aggregateId,
          aggregateType: data.aggregateType,
          eventType: data.eventType,
          version: data.version,
          payload: data.payload,
          metadata: data.metadata,
          idempotencyKey: data.idempotencyKey,
          createdAt: new Date(),
        };
      });

      const inputs: AppendEventInput[] = [
        { aggregateId: "agg-1", aggregateType: "Lead", eventType: "LeadCreated", payload: {} },
        { aggregateId: "agg-1", aggregateType: "Lead", eventType: "LeadScored", payload: {} },
      ];

      const results = await store.appendBatch(inputs);
      expect(results).toHaveLength(2);
      expect(prisma.event.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("readByType", () => {
    it("filters events by type", async () => {
      prisma.event.findMany.mockResolvedValue([
        {
          id: "evt-1",
          aggregateId: "agg-1",
          aggregateType: "Lead",
          eventType: "LeadCreated",
          version: 1,
          payload: {},
          metadata: {},
          idempotencyKey: null,
          createdAt: new Date(),
        },
      ]);

      const events = await store.readByType("LeadCreated");
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe("LeadCreated");
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventType: "LeadCreated" },
          orderBy: { createdAt: "asc" },
          take: 100,
        }),
      );
    });

    it("supports cursor-based pagination with fromId", async () => {
      const cursorDate = new Date("2025-01-15");
      prisma.event.findUnique.mockResolvedValue({
        id: "evt-5",
        createdAt: cursorDate,
      });
      prisma.event.findMany.mockResolvedValue([]);

      await store.readByType("LeadCreated", "evt-5", 50);

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: "evt-5" },
      });
      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventType: "LeadCreated", createdAt: { gt: cursorDate } },
          take: 50,
        }),
      );
    });
  });

  describe("getLatestVersion", () => {
    it("returns 0 when no events exist", async () => {
      prisma.event.findFirst.mockResolvedValue(null);

      const version = await store.getLatestVersion("nonexistent");
      expect(version).toBe(0);
    });

    it("returns the highest version number", async () => {
      prisma.event.findFirst.mockResolvedValue({ version: 7 });

      const version = await store.getLatestVersion("agg-1");
      expect(version).toBe(7);
      expect(prisma.event.findFirst).toHaveBeenCalledWith({
        where: { aggregateId: "agg-1" },
        orderBy: { version: "desc" },
        select: { version: true },
      });
    });
  });

  describe("ConcurrencyError", () => {
    it("has correct name and message", () => {
      const error = new ConcurrencyError("version mismatch");
      expect(error.name).toBe("ConcurrencyError");
      expect(error.message).toBe("version mismatch");
      expect(error).toBeInstanceOf(Error);
    });
  });
});
