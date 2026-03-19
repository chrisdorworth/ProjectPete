import { describe, it, expect } from "vitest";
import { serializeEvent, deserializeEvent } from "../serializer.js";
import type { StoredEvent } from "../store.js";

describe("Serializer", () => {
  describe("serializeEvent", () => {
    it("converts bigint fields to strings in payload", () => {
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "HouseholdValueUpdated",
        version: 1,
        timestamp: new Date("2025-01-15"),
        metadata: {},
        payload: {
          householdId: "hh-1",
          previousValueCents: 0n,
          newValueCents: 5000000n,
          memberCount: 2,
          trigger: "enrichment",
        },
      };

      const result = serializeEvent(event as any);
      expect(result.payload.previousValueCents).toBe("0");
      expect(result.payload.newValueCents).toBe("5000000");
      expect(typeof result.payload.previousValueCents).toBe("string");
      expect(typeof result.payload.newValueCents).toBe("string");
    });

    it("preserves string and number fields", () => {
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "LeadCreated",
        version: 1,
        timestamp: new Date(),
        metadata: {},
        payload: {
          leadId: "lead-1",
          firstName: "John",
          compositeScore: 78,
        },
      };

      const result = serializeEvent(event as any);
      expect(result.payload.leadId).toBe("lead-1");
      expect(result.payload.firstName).toBe("John");
      expect(result.payload.compositeScore).toBe(78);
    });

    it("converts Date fields to ISO strings in payload", () => {
      const date = new Date("2025-06-15T10:30:00Z");
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "SomeEvent",
        version: 1,
        timestamp: new Date(),
        metadata: {},
        payload: {
          scheduledAt: date,
          label: "test",
        },
      };

      const result = serializeEvent(event as any);
      expect(result.payload.scheduledAt).toBe("2025-06-15T10:30:00.000Z");
    });

    it("handles nested objects recursively", () => {
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "SomeEvent",
        version: 1,
        timestamp: new Date(),
        metadata: {},
        payload: {
          nested: {
            valueCents: 100n,
            name: "test",
          },
        },
      };

      const result = serializeEvent(event as any);
      const nested = result.payload.nested as Record<string, unknown>;
      expect(nested.valueCents).toBe("100");
      expect(nested.name).toBe("test");
    });

    it("handles arrays with objects", () => {
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "ComplianceReviewed",
        version: 1,
        timestamp: new Date(),
        metadata: {},
        payload: {
          checks: [
            { rule: "CAN-SPAM", passed: true, amount: 500n },
            { rule: "FINRA", passed: false, amount: 0n },
          ],
        },
      };

      const result = serializeEvent(event as any);
      const checks = result.payload.checks as Array<Record<string, unknown>>;
      expect(checks[0].amount).toBe("500");
      expect(checks[1].amount).toBe("0");
      expect(checks[0].rule).toBe("CAN-SPAM");
    });

    it("preserves arrays of primitives", () => {
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "SomeEvent",
        version: 1,
        timestamp: new Date(),
        metadata: {},
        payload: {
          tags: ["a", "b", "c"],
          scores: [1, 2, 3],
        },
      };

      const result = serializeEvent(event as any);
      expect(result.payload.tags).toEqual(["a", "b", "c"]);
      expect(result.payload.scores).toEqual([1, 2, 3]);
    });

    it("extracts eventType from the event type field", () => {
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "LeadCreated",
        version: 1,
        timestamp: new Date(),
        metadata: { source: "test" },
        payload: { leadId: "lead-1" },
      };

      const result = serializeEvent(event as any);
      expect(result.eventType).toBe("LeadCreated");
      expect(result.metadata).toEqual({ source: "test" });
    });
  });

  describe("deserializeEvent", () => {
    it("maps stored event fields to MeridianEvent shape", () => {
      const stored: StoredEvent = {
        id: "evt-1",
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        version: 3,
        payload: { leadId: "lead-1", firstName: "John" },
        metadata: { correlationId: "corr-1" },
        idempotencyKey: "idem-1",
        createdAt: new Date("2025-01-15T08:00:00Z"),
      };

      const event = deserializeEvent(stored);
      expect(event.id).toBe("evt-1");
      expect(event.aggregateId).toBe("agg-1");
      expect(event.type).toBe("LeadCreated");
      expect(event.version).toBe(3);
      expect(event.timestamp).toEqual(new Date("2025-01-15T08:00:00Z"));
      expect(event.metadata).toEqual({ correlationId: "corr-1" });
    });

    it("passes payload through fromStoredPayload", () => {
      const stored: StoredEvent = {
        id: "evt-2",
        aggregateId: "agg-2",
        aggregateType: "Household",
        eventType: "HouseholdValueUpdated",
        version: 1,
        payload: { newValueCents: "5000000", memberCount: 2 },
        metadata: {},
        idempotencyKey: null,
        createdAt: new Date(),
      };

      const event = deserializeEvent(stored);
      expect(event.payload).toEqual({ newValueCents: BigInt(5000000), memberCount: 2 });
    });
  });

  describe("round-trip serialization", () => {
    it("preserves data through serialize then deserialize", () => {
      const original = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "LeadCreated",
        version: 5,
        timestamp: new Date("2025-03-01T12:00:00Z"),
        metadata: { userId: "user-42" },
        payload: {
          leadId: "lead-1",
          firstName: "Jane",
          score: 92,
        },
      };

      const serialized = serializeEvent(original as any);

      const storedEvent: StoredEvent = {
        id: original.id,
        aggregateId: original.aggregateId,
        aggregateType: "Lead",
        eventType: serialized.eventType,
        version: original.version,
        payload: serialized.payload,
        metadata: serialized.metadata,
        idempotencyKey: null,
        createdAt: original.timestamp,
      };

      const deserialized = deserializeEvent(storedEvent);
      expect(deserialized.id).toBe(original.id);
      expect(deserialized.aggregateId).toBe(original.aggregateId);
      expect(deserialized.type).toBe(original.type);
      expect(deserialized.version).toBe(original.version);
      expect(deserialized.timestamp).toEqual(original.timestamp);
      expect(deserialized.metadata).toEqual(original.metadata);
      expect(deserialized.payload).toEqual(original.payload);
    });
  });

  describe("null field handling", () => {
    it("preserves null values in payload", () => {
      const event = {
        id: "evt-1",
        aggregateId: "agg-1",
        type: "DraftGenerated",
        version: 1,
        timestamp: new Date(),
        metadata: {},
        payload: {
          leadId: "lead-1",
          content: null,
          variant: null,
          channel: "email",
        },
      };

      const result = serializeEvent(event as any);
      expect(result.payload.content).toBeNull();
      expect(result.payload.variant).toBeNull();
      expect(result.payload.channel).toBe("email");
    });

    it("deserializes stored events with null idempotencyKey", () => {
      const stored: StoredEvent = {
        id: "evt-1",
        aggregateId: "agg-1",
        aggregateType: "Lead",
        eventType: "LeadCreated",
        version: 1,
        payload: { leadId: "lead-1" },
        metadata: {},
        idempotencyKey: null,
        createdAt: new Date(),
      };

      const event = deserializeEvent(stored);
      expect(event.id).toBe("evt-1");
      expect(event.type).toBe("LeadCreated");
    });
  });
});
