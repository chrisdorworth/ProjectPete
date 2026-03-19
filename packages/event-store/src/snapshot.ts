import type { PrismaClient } from "@prisma/client";

export interface SnapshotData {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, unknown>;
}

const SNAPSHOT_INTERVAL = 50;

export class SnapshotStore {
  constructor(private readonly prisma: PrismaClient) {}

  async getLatest(aggregateId: string): Promise<SnapshotData | null> {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { aggregateId },
      orderBy: { version: "desc" },
    });

    if (!snapshot) return null;

    return {
      aggregateId: snapshot.aggregateId,
      aggregateType: snapshot.aggregateType,
      version: snapshot.version,
      state: snapshot.state as Record<string, unknown>,
    };
  }

  async save(data: SnapshotData): Promise<void> {
    await this.prisma.snapshot.upsert({
      where: {
        aggregateId_version: {
          aggregateId: data.aggregateId,
          version: data.version,
        },
      },
      update: { state: data.state },
      create: {
        aggregateId: data.aggregateId,
        aggregateType: data.aggregateType,
        version: data.version,
        state: data.state,
      },
    });
  }

  shouldSnapshot(currentVersion: number, lastSnapshotVersion: number): boolean {
    return currentVersion - lastSnapshotVersion >= SNAPSHOT_INTERVAL;
  }
}
