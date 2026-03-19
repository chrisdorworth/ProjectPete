import { describe, it, expect } from "vitest";
import {
  canTransition,
  getValidTransitions,
  isTerminal,
  isActive,
  PIPELINE_STAGES,
} from "../value-objects/lead-status.js";

describe("LeadStatus", () => {
  it("allows valid transitions", () => {
    expect(canTransition("new", "enriching")).toBe(true);
    expect(canTransition("enriching", "enriched")).toBe(true);
    expect(canTransition("scored", "drafting")).toBe(true);
    expect(canTransition("contacted", "meeting_booked")).toBe(true);
    expect(canTransition("proposal_sent", "converted")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(canTransition("new", "converted")).toBe(false);
    expect(canTransition("enriching", "contacted")).toBe(false);
    expect(canTransition("converted", "new")).toBe(false);
  });

  it("allows suppression from most statuses", () => {
    expect(canTransition("new", "suppressed")).toBe(true);
    expect(canTransition("scored", "suppressed")).toBe(true);
    expect(canTransition("contacted", "suppressed")).toBe(true);
  });

  it("identifies terminal statuses", () => {
    expect(isTerminal("converted")).toBe(true);
    expect(isTerminal("suppressed")).toBe(true);
    expect(isTerminal("new")).toBe(false);
    expect(isTerminal("contacted")).toBe(false);
  });

  it("identifies active statuses", () => {
    expect(isActive("new")).toBe(true);
    expect(isActive("scored")).toBe(true);
    expect(isActive("converted")).toBe(false);
    expect(isActive("suppressed")).toBe(false);
    expect(isActive("disqualified")).toBe(false);
    expect(isActive("lost")).toBe(false);
  });

  it("returns valid transitions for a status", () => {
    const transitions = getValidTransitions("contacted");
    expect(transitions).toContain("responded");
    expect(transitions).toContain("meeting_booked");
    expect(transitions).toContain("disqualified");
    expect(transitions).not.toContain("enriching");
  });

  it("allows re-entry from disqualified/lost", () => {
    expect(canTransition("disqualified", "new")).toBe(true);
    expect(canTransition("lost", "new")).toBe(true);
  });

  it("pipeline stages are ordered", () => {
    expect(PIPELINE_STAGES[0]).toBe("new");
    expect(PIPELINE_STAGES[PIPELINE_STAGES.length - 1]).toBe("converted");
  });
});
