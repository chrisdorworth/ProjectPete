import { describe, it, expect } from "vitest";
import {
  createInitialLeadState,
  applyEvent,
  hydrateLeadFromEvents,
  validateLeadCommand,
} from "../aggregates/lead-aggregate.js";
import type { MeridianEvent, LeadCreated, LeadPromoted, LeadSuppressed, LeadScored } from "../events/index.js";

function makeEvent<T extends MeridianEvent>(partial: Omit<T, "id" | "version" | "timestamp" | "metadata"> & Partial<Pick<T, "id" | "version" | "timestamp" | "metadata">>): T {
  return {
    id: "evt-1",
    version: 1,
    timestamp: new Date("2025-01-15"),
    metadata: {},
    ...partial,
  } as T;
}

describe("LeadAggregate", () => {
  it("creates initial state", () => {
    const state = createInitialLeadState();
    expect(state.id).toBe("");
    expect(state.status).toBe("new");
    expect(state.compositeScore).toBe(0);
    expect(state.signalIds).toHaveLength(0);
  });

  it("applies LeadCreated event", () => {
    const event = makeEvent<LeadCreated>({
      type: "LeadCreated",
      aggregateId: "lead-1",
      payload: {
        leadId: "lead-1",
        signalId: "sig-1",
        firstName: "John",
        lastName: "Smith",
        fullName: "John Smith",
        company: "Acme Corp",
        title: "CEO",
        county: "Orange",
        state: "FL",
        estimatedValueCents: "65000000",
      },
    });

    const state = applyEvent(createInitialLeadState(), event);
    expect(state.id).toBe("lead-1");
    expect(state.firstName).toBe("John");
    expect(state.lastName).toBe("Smith");
    expect(state.company).toBe("Acme Corp");
    expect(state.estimatedValueCents).toBe(65000000n);
    expect(state.signalIds).toContain("sig-1");
  });

  it("applies LeadPromoted with valid transition", () => {
    const created = makeEvent<LeadCreated>({
      type: "LeadCreated",
      aggregateId: "lead-1",
      payload: {
        leadId: "lead-1", signalId: "sig-1", firstName: "John", lastName: "Smith",
        fullName: "John Smith", company: null, title: null, county: "Orange", state: "FL",
        estimatedValueCents: "100000",
      },
    });

    const promoted = makeEvent<LeadPromoted>({
      type: "LeadPromoted",
      aggregateId: "lead-1",
      version: 2,
      payload: {
        leadId: "lead-1",
        fromStatus: "new",
        toStatus: "enriching",
        reason: "Auto-enrich triggered",
      },
    });

    const state = hydrateLeadFromEvents([created, promoted]);
    expect(state.status).toBe("enriching");
  });

  it("ignores invalid status transitions", () => {
    const created = makeEvent<LeadCreated>({
      type: "LeadCreated",
      aggregateId: "lead-1",
      payload: {
        leadId: "lead-1", signalId: "sig-1", firstName: "John", lastName: "Smith",
        fullName: "John Smith", company: null, title: null, county: null, state: null,
        estimatedValueCents: "0",
      },
    });

    const invalid = makeEvent<LeadPromoted>({
      type: "LeadPromoted",
      aggregateId: "lead-1",
      version: 2,
      payload: {
        leadId: "lead-1",
        fromStatus: "new",
        toStatus: "converted",
        reason: "Invalid jump",
      },
    });

    const state = hydrateLeadFromEvents([created, invalid]);
    expect(state.status).toBe("new");
  });

  it("applies suppression", () => {
    const created = makeEvent<LeadCreated>({
      type: "LeadCreated",
      aggregateId: "lead-1",
      payload: {
        leadId: "lead-1", signalId: "sig-1", firstName: "John", lastName: "Smith",
        fullName: "John Smith", company: null, title: null, county: null, state: null,
        estimatedValueCents: "0",
      },
    });

    const suppressed = makeEvent<LeadSuppressed>({
      type: "LeadSuppressed",
      aggregateId: "lead-1",
      version: 2,
      payload: {
        leadId: "lead-1",
        reason: "Hard bounce",
        permanent: true,
        source: "postmark",
      },
    });

    const state = hydrateLeadFromEvents([created, suppressed]);
    expect(state.status).toBe("suppressed");
    expect(state.isSuppressed).toBe(true);
    expect(state.suppressionReason).toBe("Hard bounce");
  });

  it("applies scoring", () => {
    const created = makeEvent<LeadCreated>({
      type: "LeadCreated",
      aggregateId: "lead-1",
      payload: {
        leadId: "lead-1", signalId: "sig-1", firstName: "John", lastName: "Smith",
        fullName: "John Smith", company: null, title: null, county: null, state: null,
        estimatedValueCents: "0",
      },
    });

    const scored = makeEvent<LeadScored>({
      type: "LeadScored",
      aggregateId: "lead-1",
      version: 2,
      payload: {
        leadId: "lead-1",
        compositeScore: 78,
        qualitativeScore: 40,
        quantitativeScore: 38,
        breakdown: {
          signalStrength: 80, estimatedValue: 70, timing: 90,
          accessibility: 60, complexity: 50, convergenceBonus: 0,
          intentBonus: 0, warmPathBonus: 0,
        },
        modelVersion: "rule-v1",
        scoringMethod: "rule_based",
      },
    });

    const state = hydrateLeadFromEvents([created, scored]);
    expect(state.compositeScore).toBe(78);
    expect(state.qualitativeScore).toBe(40);
    expect(state.quantitativeScore).toBe(38);
  });

  it("validates commands against terminal state", () => {
    const state = { ...createInitialLeadState(), status: "converted" as const };
    const result = validateLeadCommand(state, "ScoreLead");
    expect(result.valid).toBe(false);
  });

  it("validates commands against suppressed state", () => {
    const state = { ...createInitialLeadState(), isSuppressed: true };
    const result = validateLeadCommand(state, "QueueOutreach");
    expect(result.valid).toBe(false);
  });

  it("allows PurgeData on suppressed leads", () => {
    const state = { ...createInitialLeadState(), isSuppressed: true };
    const result = validateLeadCommand(state, "PurgeData");
    expect(result.valid).toBe(true);
  });
});
