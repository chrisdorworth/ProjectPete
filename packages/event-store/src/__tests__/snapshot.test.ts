import { describe, it, expect, vi, beforeEach } from "vitest";
import { SnapshotStore } from "../snapshot.js";
import type { SnapshotData } from "../snapshot.js";

function createMockPrisma() {
  return {
    snapshot: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

describe("SnapshotStore", () => {
  let prisma: MockPrisma;
  let snapshotStore: SnapshotStore;

  beforeEach(() => {
    prisma = createMockPrisma();
    snapshotStore = new SnapshotStore(prisma as any);
  });

  describe("shouldSnapshot", () => {
    it("returns true at exactly 50 events since last snapshot", () => {
      expect(snapshotStore.shouldSnapshot(50, 0)).toBe(true);
    });

    it("returns true at every 50-event interval", () => {
      expect(snapshotStore.shouldSnapshot(100, 50)).toBe(true);
      expect(snapshotStore.shouldSnapshot(150, 100)).toBe(true);
      expect(snapshotStore.shouldSnapshot(200, 150)).toBe(true);
    });

    it("returns true when more than 50 events past last snapshot", () => {
      expect(snapshotStore.shouldSnapshot(75, 0)).toBe(true);
      expect(snapshotStore.shouldSnapshot(120, 50)).toBe(true);
    });

    it("returns false when fewer than 50 events since last snapshot", () => {
      expect(snapshotStore.shouldSnapshot(49, 0)).toBe(false);
      expect(snapshotStore.shouldSnapshot(30, 0)).toBe(false);
      expect(snapshotStore.shouldSnapshot(1, 0)).toBe(false);
    });

    it("returns false at 0 events", () => {
      expect(snapshotStore.shouldSnapshot(0, 0)).toBe(false);
    });

    it("returns false when difference is exactly 49", () => {
      expect(snapshotStore.shouldSnapshot(99, 50)).toBe(false);
    });
  });

  describe("getLatest", () => {
    it("returns null when no snapshot exists", async () => {
      prisma.snapshot.findFirst.mockResolvedValue(null);

      const result = await snapshotStore.getLatest("agg-1");
      expect(result).toBeNull();
      expect(prisma.snapshot.findFirst).toHaveBeenCalledWith({
        where: { aggregateId: "agg-1" },
        orderBy: { version: "desc" },
      });
    });

    it("returns the latest snapshot data", async () => {
      prisma.snapshot.findFirst.mockResolvedValue({
        aggregateId: "agg-1",
        aggregateType: "Lead",
        version: 50,
        state: { id: "lead-1", status: "enriched", compositeScore: 78 },
      });

      const result = await snapshotStore.getLatest("agg-1");
      expect(result).not.toBeNull();
      expect(result!.aggregateId).toBe("agg-1");
      expect(result!.aggregateType).toBe("Lead");
      expect(result!.version).toBe(50);
      expect(result!.state).toEqual({ id: "lead-1", status: "enriched", compositeScore: 78 });
    });
  });

  describe("save", () => {
    it("upserts snapshot with correct compound key", async () => {
      prisma.snapshot.upsert.mockResolvedValue({});

      const data: SnapshotData = {
        aggregateId: "agg-1",
        aggregateType: "Lead",
        version: 50,
        state: { id: "lead-1", status: "active" },
      };

      await snapshotStore.save(data);

      expect(prisma.snapshot.upsert).toHaveBeenCalledWith({
        where: {
          aggregateId_version: {
            aggregateId: "agg-1",
            version: 50,
          },
        },
        update: { state: { id: "lead-1", status: "active" } },
        create: {
          aggregateId: "agg-1",
          aggregateType: "Lead",
          version: 50,
          state: { id: "lead-1", status: "active" },
        },
      });
    });

    it("updates existing snapshot state on version collision", async () => {
      prisma.snapshot.upsert.mockResolvedValue({});

      const data: SnapshotData = {
        aggregateId: "agg-1",
        aggregateType: "Lead",
        version: 50,
        state: { id: "lead-1", status: "updated" },
      };

      await snapshotStore.save(data);

      const call = prisma.snapshot.upsert.mock.calls[0][0];
      expect(call.update).toEqual({ state: { id: "lead-1", status: "updated" } });
    });
  });
});
