import type { MeridianEvent } from "@meridian/domain";
import type { StoredEvent } from "./store.js";

export function serializeEvent(event: MeridianEvent): {
  eventType: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
} {
  return {
    eventType: event.type,
    payload: toSerializablePayload(event.payload),
    metadata: event.metadata,
  };
}

export function deserializeEvent(stored: StoredEvent): MeridianEvent {
  return {
    id: stored.id,
    aggregateId: stored.aggregateId,
    type: stored.eventType,
    version: stored.version,
    timestamp: stored.createdAt,
    metadata: stored.metadata,
    payload: fromStoredPayload(stored.payload),
  } as unknown as MeridianEvent;
}

function toSerializablePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "bigint") {
      result[key] = value.toString();
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? toSerializablePayload(item as Record<string, unknown>)
          : item,
      );
    } else if (typeof value === "object" && value !== null) {
      result[key] = toSerializablePayload(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

const ISO_8601_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function fromStoredPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && ISO_8601_RE.test(value)) {
      result[key] = new Date(value);
    } else if (
      typeof value === "string" &&
      key.endsWith("Cents") &&
      /^\d+$/.test(value)
    ) {
      result[key] = BigInt(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? fromStoredPayload(item as Record<string, unknown>)
          : item,
      );
    } else if (typeof value === "object" && value !== null) {
      result[key] = fromStoredPayload(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
