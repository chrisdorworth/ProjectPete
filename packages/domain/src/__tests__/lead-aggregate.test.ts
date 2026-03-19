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

  it("applies SignalLinked event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", signalIds: ["sig-1"] };
    const event = makeEvent({ type: "SignalLinked", aggregateId: "lead-1", payload: { leadId: "lead-1", signalId: "sig-2" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.signalIds).toContain("sig-2");
    expect(result.signalIds).toHaveLength(2);
  });

  it("applies LeadAssigned event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "LeadAssigned", aggregateId: "lead-1", payload: { leadId: "lead-1", repId: "rep-1", territoryId: "t-1", assignmentReason: "territory match" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.assignedRepId).toBe("rep-1");
    expect(result.territoryId).toBe("t-1");
  });

  it("applies EnrichmentRequested event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "EnrichmentRequested", aggregateId: "lead-1", payload: { leadId: "lead-1", providers: ["apollo"] } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.enrichmentStatus).toBe("in_progress");
  });

  it("applies EnrichmentMerged event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", enrichmentStatus: "in_progress" as const };
    const event = makeEvent({ type: "EnrichmentMerged", aggregateId: "lead-1", payload: { leadId: "lead-1", completeness: 0.85, fieldsPopulated: ["email", "phone"], providersUsed: ["apollo"], totalConfidence: 0.8 } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.enrichmentStatus).toBe("completed");
    expect(result.enrichmentCompleteness).toBe(0.85);
  });

  it("applies EnrichmentFailed event — partial data stays completed", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", enrichmentCompleteness: 0.5 };
    const event = makeEvent({ type: "EnrichmentFailed", aggregateId: "lead-1", payload: { leadId: "lead-1", provider: "hunter", error: "timeout" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.enrichmentStatus).toBe("completed");
  });

  it("applies EnrichmentFailed event — no data becomes failed", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", enrichmentCompleteness: 0 };
    const event = makeEvent({ type: "EnrichmentFailed", aggregateId: "lead-1", payload: { leadId: "lead-1", provider: "apollo", error: "timeout" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.enrichmentStatus).toBe("failed");
  });

  it("applies LeadRescored event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", compositeScore: 50 };
    const event = makeEvent({ type: "LeadRescored", aggregateId: "lead-1", payload: { leadId: "lead-1", previousScore: 50, newScore: 72, breakdown: { signalStrength: 80, estimatedValue: 70, timing: 60, accessibility: 50, complexity: 40, convergenceBonus: 5, intentBonus: 3, warmPathBonus: 5 }, reason: "New signal" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.compositeScore).toBe(72);
  });

  it("applies ScoreOverridden event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", compositeScore: 50 };
    const event = makeEvent({ type: "ScoreOverridden", aggregateId: "lead-1", payload: { leadId: "lead-1", previousScore: 50, newScore: 85, overriddenBy: "rep-1", reason: "Client referral" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.compositeScore).toBe(85);
  });

  it("applies RapportExtracted event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "RapportExtracted", aggregateId: "lead-1", payload: { leadId: "lead-1", hookCount: 4, hooks: [] } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.rapportHookCount).toBe(4);
  });

  it("applies WarmPathFound event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "WarmPathFound", aggregateId: "lead-1", payload: { leadId: "lead-1", paths: [{ through: "client-1", hops: 2 }] } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.hasWarmPath).toBe(true);
  });

  it("applies WarmPathFound with empty paths", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "WarmPathFound", aggregateId: "lead-1", payload: { leadId: "lead-1", paths: [] } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.hasWarmPath).toBe(false);
  });

  it("applies CompetitorDetected event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "CompetitorDetected", aggregateId: "lead-1", payload: { leadId: "lead-1", advisorName: "Other FA", firm: "Big Wealth" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.competitorDetected).toBe(true);
  });

  it("applies HouseholdFormed event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "HouseholdFormed", aggregateId: "lead-1", payload: { householdId: "hh-1", primaryLeadId: "lead-1", matchReason: "shared_address", confidence: 0.9 } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.householdId).toBe("hh-1");
  });

  it("applies HouseholdMemberAdded event for own lead", () => {
    const state = { ...createInitialLeadState(), id: "lead-2" };
    const event = makeEvent({ type: "HouseholdMemberAdded", aggregateId: "hh-1", payload: { householdId: "hh-1", leadId: "lead-2", matchReason: "relative" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.householdId).toBe("hh-1");
  });

  it("ignores HouseholdMemberAdded for different lead", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "HouseholdMemberAdded", aggregateId: "hh-1", payload: { householdId: "hh-1", leadId: "lead-2", matchReason: "relative" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.householdId).toBeNull();
  });

  it("applies OutreachSent event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", outreachAttemptCount: 2 };
    const event = makeEvent({ type: "OutreachSent", aggregateId: "lead-1", payload: { outreachId: "out-1", leadId: "lead-1", channel: "email" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.outreachAttemptCount).toBe(3);
    expect(result.lastContactAt).toEqual(event.timestamp);
  });

  it("applies MeetingBooked with valid transition", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", status: "contacted" as const };
    const event = makeEvent({ type: "MeetingBooked", aggregateId: "lead-1", payload: { leadId: "lead-1", bookedAt: new Date().toISOString(), repId: "rep-1" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.status).toBe("meeting_booked");
  });

  it("applies LeadConverted with valid transition", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", status: "proposal_sent" as const };
    const event = makeEvent({ type: "LeadConverted", aggregateId: "lead-1", payload: { leadId: "lead-1", aumCents: "50000000", repId: "rep-1" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.status).toBe("converted");
  });

  it("applies LeadDisqualified with valid transition", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", status: "contacted" as const };
    const event = makeEvent({ type: "LeadDisqualified", aggregateId: "lead-1", payload: { leadId: "lead-1", reason: "Not a fit", repId: "rep-1" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.status).toBe("disqualified");
  });

  it("applies LeadLost with valid transition", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", status: "qualified" as const };
    const event = makeEvent({ type: "LeadLost", aggregateId: "lead-1", payload: { leadId: "lead-1", reason: "Chose competitor", repId: "rep-1" } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.status).toBe("lost");
  });

  it("applies LeadMerged event", () => {
    const state = { ...createInitialLeadState(), id: "lead-1", signalIds: ["sig-1"] };
    const event = makeEvent({ type: "LeadMerged", aggregateId: "lead-1", payload: { survivorLeadId: "lead-1", mergedLeadId: "lead-2", mergeReason: "exact_email_match", matchScore: 0.95, mergedSignalIds: ["sig-2", "sig-3"], mergedEnrichmentCompleteness: 0.7 } });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result.signalIds).toContain("sig-2");
    expect(result.signalIds).toContain("sig-3");
    expect(result.signalIds).toHaveLength(3);
    expect(result.enrichmentCompleteness).toBe(0.7);
  });

  it("returns state unchanged for unknown event types", () => {
    const state = { ...createInitialLeadState(), id: "lead-1" };
    const event = makeEvent({ type: "SomeUnknownEvent" as any, aggregateId: "lead-1", payload: {} });
    const result = applyEvent(state, event as MeridianEvent);
    expect(result).toEqual(state);
  });

  it("hydrates full lifecycle from events", () => {
    const events: MeridianEvent[] = [
      makeEvent({ type: "LeadCreated", aggregateId: "lead-1", version: 1, payload: { leadId: "lead-1", signalId: "sig-1", firstName: "Jane", lastName: "Doe", fullName: "Jane Doe", company: "TechCo", title: "CTO", county: "Orange", state: "FL", estimatedValueCents: "200000000" } }),
      makeEvent({ type: "EnrichmentRequested", aggregateId: "lead-1", version: 2, payload: { leadId: "lead-1", providers: ["apollo"] } }),
      makeEvent({ type: "EnrichmentMerged", aggregateId: "lead-1", version: 3, payload: { leadId: "lead-1", completeness: 0.75, fieldsPopulated: ["email"], providersUsed: ["apollo"], totalConfidence: 0.85 } }),
      makeEvent({ type: "LeadScored", aggregateId: "lead-1", version: 4, payload: { leadId: "lead-1", compositeScore: 82, qualitativeScore: 42, quantitativeScore: 40, breakdown: { signalStrength: 25, estimatedValue: 25, timing: 15, accessibility: 10, complexity: 7, convergenceBonus: 0, intentBonus: 0, warmPathBonus: 0 }, modelVersion: "rule-v1", scoringMethod: "rule_based" } }),
      makeEvent({ type: "LeadAssigned", aggregateId: "lead-1", version: 5, payload: { leadId: "lead-1", repId: "rep-1", territoryId: "t-1", assignmentReason: "territory" } }),
    ] as MeridianEvent[];

    const state = hydrateLeadFromEvents(events);
    expect(state.id).toBe("lead-1");
    expect(state.firstName).toBe("Jane");
    expect(state.enrichmentStatus).toBe("completed");
    expect(state.compositeScore).toBe(82);
    expect(state.assignedRepId).toBe("rep-1");
    expect(state.version).toBe(5);
  });

  it("allows ExportData on suppressed leads", () => {
    const state = { ...createInitialLeadState(), isSuppressed: true };
    const result = validateLeadCommand(state, "ExportData");
    expect(result.valid).toBe(true);
  });

  it("validates normal commands on active leads", () => {
    const state = { ...createInitialLeadState(), status: "scored" as const };
    const result = validateLeadCommand(state, "QueueOutreach");
    expect(result.valid).toBe(true);
  });
});
