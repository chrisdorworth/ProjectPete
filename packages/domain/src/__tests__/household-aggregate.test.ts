import { describe, it, expect } from "vitest";
import {
  createInitialHouseholdState,
  applyHouseholdEvent,
  hydrateHouseholdFromEvents,
} from "../aggregates/household-aggregate.js";
import type {
  MeridianEvent,
  HouseholdFormed,
  HouseholdMemberAdded,
  HouseholdValueUpdated,
} from "../events/index.js";

function makeEvent<T extends MeridianEvent>(
  partial: Omit<T, "id" | "version" | "timestamp" | "metadata"> &
    Partial<Pick<T, "id" | "version" | "timestamp" | "metadata">>,
): T {
  return {
    id: "evt-1",
    version: 1,
    timestamp: new Date("2025-01-15"),
    metadata: {},
    ...partial,
  } as T;
}

describe("HouseholdAggregate", () => {
  describe("createInitialHouseholdState", () => {
    it("returns blank initial state", () => {
      const state = createInitialHouseholdState();
      expect(state.id).toBe("");
      expect(state.memberLeadIds).toEqual([]);
      expect(state.address).toBeNull();
      expect(state.county).toBeNull();
      expect(state.combinedValueCents).toBe(0n);
      expect(state.combinedWealthCents).toBe(0n);
      expect(state.highestScore).toBe(0);
      expect(state.memberCount).toBe(0);
      expect(state.version).toBe(0);
    });
  });

  describe("applyHouseholdEvent - HouseholdFormed", () => {
    it("sets household id, members, address, and county", () => {
      const event = makeEvent<HouseholdFormed>({
        type: "HouseholdFormed",
        aggregateId: "hh-1",
        payload: {
          householdId: "hh-1",
          memberLeadIds: ["lead-1", "lead-2"],
          formationReason: "shared_address",
          address: "123 Main St",
          county: "Orange",
        },
      });

      const state = applyHouseholdEvent(createInitialHouseholdState(), event);
      expect(state.id).toBe("hh-1");
      expect(state.memberLeadIds).toEqual(["lead-1", "lead-2"]);
      expect(state.address).toBe("123 Main St");
      expect(state.county).toBe("Orange");
      expect(state.memberCount).toBe(2);
      expect(state.version).toBe(1);
      expect(state.createdAt).toEqual(new Date("2025-01-15"));
    });

    it("handles null address and county", () => {
      const event = makeEvent<HouseholdFormed>({
        type: "HouseholdFormed",
        aggregateId: "hh-2",
        payload: {
          householdId: "hh-2",
          memberLeadIds: ["lead-3"],
          formationReason: "manual",
          address: null,
          county: null,
        },
      });

      const state = applyHouseholdEvent(createInitialHouseholdState(), event);
      expect(state.address).toBeNull();
      expect(state.county).toBeNull();
      expect(state.memberCount).toBe(1);
    });
  });

  describe("applyHouseholdEvent - HouseholdMemberAdded", () => {
    it("adds a new member to the household", () => {
      const formed = makeEvent<HouseholdFormed>({
        type: "HouseholdFormed",
        aggregateId: "hh-1",
        payload: {
          householdId: "hh-1",
          memberLeadIds: ["lead-1"],
          formationReason: "shared_address",
          address: "123 Main St",
          county: "Orange",
        },
      });

      const memberAdded = makeEvent<HouseholdMemberAdded>({
        type: "HouseholdMemberAdded",
        aggregateId: "hh-1",
        version: 2,
        payload: {
          householdId: "hh-1",
          leadId: "lead-2",
          relationship: "spouse",
          addReason: "Whitepages match",
        },
      });

      const state = hydrateHouseholdFromEvents([formed, memberAdded]);
      expect(state.memberLeadIds).toEqual(["lead-1", "lead-2"]);
      expect(state.memberCount).toBe(2);
      expect(state.version).toBe(2);
    });

    it("does not add duplicate members", () => {
      const formed = makeEvent<HouseholdFormed>({
        type: "HouseholdFormed",
        aggregateId: "hh-1",
        payload: {
          householdId: "hh-1",
          memberLeadIds: ["lead-1"],
          formationReason: "shared_address",
          address: "123 Main St",
          county: "Orange",
        },
      });

      const duplicateMember = makeEvent<HouseholdMemberAdded>({
        type: "HouseholdMemberAdded",
        aggregateId: "hh-1",
        version: 2,
        payload: {
          householdId: "hh-1",
          leadId: "lead-1",
          relationship: "self",
          addReason: "Re-added",
        },
      });

      const state = hydrateHouseholdFromEvents([formed, duplicateMember]);
      expect(state.memberLeadIds).toEqual(["lead-1"]);
      expect(state.memberCount).toBe(1);
    });
  });

  describe("applyHouseholdEvent - HouseholdValueUpdated", () => {
    it("updates combined value and member count", () => {
      const formed = makeEvent<HouseholdFormed>({
        type: "HouseholdFormed",
        aggregateId: "hh-1",
        payload: {
          householdId: "hh-1",
          memberLeadIds: ["lead-1"],
          formationReason: "shared_address",
          address: "123 Main St",
          county: "Orange",
        },
      });

      const valueUpdated = makeEvent<HouseholdValueUpdated>({
        type: "HouseholdValueUpdated",
        aggregateId: "hh-1",
        version: 2,
        payload: {
          householdId: "hh-1",
          previousValueCents: "0",
          newValueCents: "5000000",
          memberCount: 2,
          trigger: "enrichment",
        },
      });

      const state = hydrateHouseholdFromEvents([formed, valueUpdated]);
      expect(state.combinedValueCents).toBe(5000000n);
      expect(state.memberCount).toBe(2);
      expect(state.version).toBe(2);
    });
  });

  describe("hydrateHouseholdFromEvents", () => {
    it("hydrates state from a sequence of events", () => {
      const events: MeridianEvent[] = [
        makeEvent<HouseholdFormed>({
          type: "HouseholdFormed",
          aggregateId: "hh-1",
          version: 1,
          payload: {
            householdId: "hh-1",
            memberLeadIds: ["lead-1"],
            formationReason: "shared_address",
            address: "100 Oak Ave",
            county: "Palm Beach",
          },
        }),
        makeEvent<HouseholdMemberAdded>({
          type: "HouseholdMemberAdded",
          aggregateId: "hh-1",
          version: 2,
          payload: {
            householdId: "hh-1",
            leadId: "lead-2",
            relationship: "spouse",
            addReason: "Whitepages match",
          },
        }),
        makeEvent<HouseholdMemberAdded>({
          type: "HouseholdMemberAdded",
          aggregateId: "hh-1",
          version: 3,
          payload: {
            householdId: "hh-1",
            leadId: "lead-3",
            relationship: "child",
            addReason: "Whitepages match",
          },
        }),
        makeEvent<HouseholdValueUpdated>({
          type: "HouseholdValueUpdated",
          aggregateId: "hh-1",
          version: 4,
          payload: {
            householdId: "hh-1",
            previousValueCents: "0",
            newValueCents: "12000000",
            memberCount: 3,
            trigger: "enrichment",
          },
        }),
      ];

      const state = hydrateHouseholdFromEvents(events);
      expect(state.id).toBe("hh-1");
      expect(state.memberLeadIds).toEqual(["lead-1", "lead-2", "lead-3"]);
      expect(state.memberCount).toBe(3);
      expect(state.combinedValueCents).toBe(12000000n);
      expect(state.address).toBe("100 Oak Ave");
      expect(state.county).toBe("Palm Beach");
      expect(state.version).toBe(4);
    });

    it("returns initial state for empty event list", () => {
      const state = hydrateHouseholdFromEvents([]);
      expect(state.id).toBe("");
      expect(state.memberLeadIds).toEqual([]);
      expect(state.version).toBe(0);
    });
  });

  describe("value tracking across updates", () => {
    it("tracks successive value changes", () => {
      const formed = makeEvent<HouseholdFormed>({
        type: "HouseholdFormed",
        aggregateId: "hh-1",
        version: 1,
        payload: {
          householdId: "hh-1",
          memberLeadIds: ["lead-1"],
          formationReason: "co_ownership",
          address: null,
          county: null,
        },
      });

      const firstValue = makeEvent<HouseholdValueUpdated>({
        type: "HouseholdValueUpdated",
        aggregateId: "hh-1",
        version: 2,
        payload: {
          householdId: "hh-1",
          previousValueCents: "0",
          newValueCents: "3000000",
          memberCount: 1,
          trigger: "enrichment",
        },
      });

      const secondValue = makeEvent<HouseholdValueUpdated>({
        type: "HouseholdValueUpdated",
        aggregateId: "hh-1",
        version: 3,
        payload: {
          householdId: "hh-1",
          previousValueCents: "3000000",
          newValueCents: "7500000",
          memberCount: 1,
          trigger: "manual_update",
        },
      });

      const state = hydrateHouseholdFromEvents([formed, firstValue, secondValue]);
      expect(state.combinedValueCents).toBe(7500000n);
      expect(state.version).toBe(3);
    });
  });

  describe("unknown events", () => {
    it("ignores unrecognized event types", () => {
      const formed = makeEvent<HouseholdFormed>({
        type: "HouseholdFormed",
        aggregateId: "hh-1",
        version: 1,
        payload: {
          householdId: "hh-1",
          memberLeadIds: ["lead-1"],
          formationReason: "shared_address",
          address: "123 Main St",
          county: "Orange",
        },
      });

      const unknown = {
        id: "evt-99",
        aggregateId: "hh-1",
        type: "SomeFutureEvent",
        version: 2,
        timestamp: new Date("2025-02-01"),
        metadata: {},
        payload: { foo: "bar" },
      } as unknown as MeridianEvent;

      const state = hydrateHouseholdFromEvents([formed, unknown]);
      expect(state.id).toBe("hh-1");
      expect(state.version).toBe(1);
    });
  });
});
