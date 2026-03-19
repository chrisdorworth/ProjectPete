import type { PrismaClient } from "@prisma/client";
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
    if (input.idempotencyKey) {
      const existing = await this.prisma.event.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return this.toStoredEvent(existing);
      }
    }

    const currentVersion = await this.getLatestVersion(input.aggregateId);
    const nextVersion = currentVersion + 1;

    if (input.expectedVersion !== undefined && currentVersion !== input.expectedVersion) {
      throw new ConcurrencyError(
        `Expected version ${input.expectedVersion} but found ${currentVersion} for aggregate ${input.aggregateId}`,
      );
    }

    const event = await this.prisma.event.create({
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

    return this.toStoredEvent(event);
  }

  async appendBatch(events: AppendEventInput[]): Promise<StoredEvent[]> {
    const results: StoredEvent[] = [];
    for (const input of events) {
      const stored = await this.append(input);
      results.push(stored);
    }
    return results;
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
