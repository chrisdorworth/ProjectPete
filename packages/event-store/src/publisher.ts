import type Redis from "ioredis";
import type { StoredEvent } from "./store.js";

const STREAM_KEY = "meridian:events";
const MAX_STREAM_LEN = 100_000;

export class EventPublisher {
  constructor(private readonly redis: Redis) {}

  async publish(event: StoredEvent): Promise<string> {
    const messageId = await this.redis.xadd(
      STREAM_KEY,
      "MAXLEN",
      "~",
      MAX_STREAM_LEN.toString(),
      "*",
      "id", event.id,
      "aggregateId", event.aggregateId,
      "aggregateType", event.aggregateType,
      "eventType", event.eventType,
      "version", event.version.toString(),
      "payload", JSON.stringify(event.payload),
      "metadata", JSON.stringify(event.metadata),
      "createdAt", event.createdAt.toISOString(),
    );
    return messageId;
  }

  async publishBatch(events: StoredEvent[]): Promise<string[]> {
    const pipeline = this.redis.pipeline();
    for (const event of events) {
      pipeline.xadd(
        STREAM_KEY,
        "MAXLEN",
        "~",
        MAX_STREAM_LEN.toString(),
        "*",
        "id", event.id,
        "aggregateId", event.aggregateId,
        "aggregateType", event.aggregateType,
        "eventType", event.eventType,
        "version", event.version.toString(),
        "payload", JSON.stringify(event.payload),
        "metadata", JSON.stringify(event.metadata),
        "createdAt", event.createdAt.toISOString(),
      );
    }
    const results = await pipeline.exec();
    return (results ?? []).map(([, id]) => id as string);
  }

  async createConsumerGroup(groupName: string): Promise<void> {
    try {
      await this.redis.xgroup("CREATE", STREAM_KEY, groupName, "0", "MKSTREAM");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("BUSYGROUP")) {
        throw err;
      }
    }
  }

  async readFromGroup(
    groupName: string,
    consumerName: string,
    count = 10,
    blockMs = 5000,
  ): Promise<StoredEvent[]> {
    const results = await this.redis.xreadgroup(
      "GROUP", groupName, consumerName,
      "COUNT", count.toString(),
      "BLOCK", blockMs.toString(),
      "STREAMS", STREAM_KEY, ">",
    );

    if (!results) return [];

    const events: StoredEvent[] = [];
    for (const [, messages] of results) {
      for (const [, fields] of messages as [string, string[]][]) {
        const fieldMap = new Map<string, string>();
        for (let i = 0; i < fields.length; i += 2) {
          fieldMap.set(fields[i]!, fields[i + 1]!);
        }
        events.push({
          id: fieldMap.get("id")!,
          aggregateId: fieldMap.get("aggregateId")!,
          aggregateType: fieldMap.get("aggregateType")!,
          eventType: fieldMap.get("eventType")!,
          version: parseInt(fieldMap.get("version")!, 10),
          payload: JSON.parse(fieldMap.get("payload")!) as Record<string, unknown>,
          metadata: JSON.parse(fieldMap.get("metadata")!) as Record<string, unknown>,
          idempotencyKey: null,
          createdAt: new Date(fieldMap.get("createdAt")!),
        });
      }
    }

    return events;
  }

  async acknowledge(groupName: string, messageIds: string[]): Promise<void> {
    if (messageIds.length > 0) {
      await this.redis.xack(STREAM_KEY, groupName, ...messageIds);
    }
  }
}
