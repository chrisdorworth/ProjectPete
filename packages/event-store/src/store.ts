import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { MeridianEvent } from "@meridian/domain";
import { randomUUID } from "node:crypto";

export interface StoredEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  version: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  idempotencyKey: string | null;
  createdAt: Date;
}

export interface AppendEventInput {
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
  expectedVersion?: number;
}

export class EventStore {
  constructor(private readonly prisma: PrismaClient) {}

  async append(input: AppendEventInput): Promise<StoredEvent> {
    try {
      const event = await this.prisma.$transaction(
        async (tx) => {
          if (input.idempotencyKey) {
            const existing = await tx.event.findUnique({
              where: { idempotencyKey: input.idempotencyKey },
            });
            if (existing) {
              return existing;
            }
          }

          const latest = await tx.event.findFirst({
            where: { aggregateId: input.aggregateId },
            orderBy: { version: "desc" },
            select: { version: true },
          });
          const currentVersion = latest?.version ?? 0;
          const nextVersion = currentVersion + 1;

          if (input.expectedVersion !== undefined && currentVersion !== input.expectedVersion) {
            throw new ConcurrencyError(
              `Expected version ${input.expectedVersion} but found ${currentVersion} for aggregate ${input.aggregateId}`,
            );
          }

          return tx.event.create({
            data: {
              id: randomUUID(),
              aggregateId: input.aggregateId,
              aggregateType: input.aggregateType,
              eventType: input.eventType,
              version: nextVersion,
              payload: input.payload,
              metadata: input.metadata ?? {},
              idempotencyKey: input.idempotencyKey ?? null,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return this.toStoredEvent(event);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const meta = error.meta as { target?: string[] } | undefined;
        if (meta?.target?.includes("idempotency_key") && input.idempotencyKey) {
          const existing = await this.prisma.event.findUnique({
            where: { idempotencyKey: input.idempotencyKey },
          });
          if (existing) {
            return this.toStoredEvent(existing);
          }
        }
      }
      throw error;
    }
  }

  async appendBatch(events: AppendEventInput[]): Promise<StoredEvent[]> {
    return this.prisma.$transaction(
      async (tx) => {
        const results: StoredEvent[] = [];
        for (const input of events) {
          if (input.idempotencyKey) {
            const existing = await tx.event.findUnique({
              where: { idempotencyKey: input.idempotencyKey },
            });
            if (existing) {
              results.push(this.toStoredEvent(existing));
              continue;
            }
          }

          const latest = await tx.event.findFirst({
            where: { aggregateId: input.aggregateId },
            orderBy: { version: "desc" },
            select: { version: true },
          });
          const currentVersion = latest?.version ?? 0;
          const nextVersion = currentVersion + 1;

          if (input.expectedVersion !== undefined && currentVersion !== input.expectedVersion) {
            throw new ConcurrencyError(
              `Expected version ${input.expectedVersion} but found ${currentVersion} for aggregate ${input.aggregateId}`,
            );
          }

          const event = await tx.event.create({
            data: {
              id: randomUUID(),
              aggregateId: input.aggregateId,
              aggregateType: input.aggregateType,
              eventType: input.eventType,
              version: nextVersion,
              payload: input.payload,
              metadata: input.metadata ?? {},
              idempotencyKey: input.idempotencyKey ?? null,
            },
          });
          results.push(this.toStoredEvent(event));
        }
        return results;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async readStream(aggregateId: string, fromVersion = 0): Promise<StoredEvent[]> {
    const events = await this.prisma.event.findMany({
      where: {
        aggregateId,
        version: { gt: fromVersion },
      },
      orderBy: { version: "asc" },
    });
    return events.map(this.toStoredEvent);
  }

  async readAll(fromId?: string, limit = 100): Promise<StoredEvent[]> {
    const where = fromId
      ? { createdAt: { gt: (await this.prisma.event.findUnique({ where: { id: fromId } }))?.createdAt } }
      : {};

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return events.map(this.toStoredEvent);
  }

  async readByType(eventType: string, fromId?: string, limit = 100): Promise<StoredEvent[]> {
    const where: Record<string, unknown> = { eventType };
    if (fromId) {
      const cursor = await this.prisma.event.findUnique({ where: { id: fromId } });
      if (cursor) {
        where["createdAt"] = { gt: cursor.createdAt };
      }
    }

    const events = await this.prisma.event.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: limit,
    });
    return events.map(this.toStoredEvent);
  }

  async getLatestVersion(aggregateId: string): Promise<number> {
    const latest = await this.prisma.event.findFirst({
      where: { aggregateId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    return latest?.version ?? 0;
  }

  async countEvents(aggregateId?: string): Promise<number> {
    return this.prisma.event.count({
      where: aggregateId ? { aggregateId } : {},
    });
  }

  private toStoredEvent(event: {
    id: string;
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    version: number;
    payload: unknown;
    metadata: unknown;
    idempotencyKey: string | null;
    createdAt: Date;
  }): StoredEvent {
    return {
      id: event.id,
      aggregateId: event.aggregateId,
      aggregateType: event.aggregateType,
      eventType: event.eventType,
      version: event.version,
      payload: event.payload as Record<string, unknown>,
      metadata: event.metadata as Record<string, unknown>,
      idempotencyKey: event.idempotencyKey,
      createdAt: event.createdAt,
    };
  }
}

export class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConcurrencyError";
  }
}
