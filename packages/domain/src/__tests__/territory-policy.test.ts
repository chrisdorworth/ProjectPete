import { describe, it, expect } from "vitest";
import { assignLeadToTerritory, isAtCapacity, getRemainingCapacity } from "../policies/territory-policy.js";
import type { Territory } from "../policies/territory-policy.js";

const territories: Territory[] = [
  {
    id: "t-1", repId: "rep-1", name: "Central FL",
    zipCodes: ["32801", "32803", "32806"],
    counties: ["Orange", "Seminole"],
    capacityCap: 100, currentLoad: 45, isActive: true,
  },
  {
    id: "t-2", repId: "rep-2", name: "Tampa Bay",
    zipCodes: ["33601", "33602"],
    counties: ["Hillsborough", "Pinellas"],
    capacityCap: 80, currentLoad: 80, isActive: true,
  },
  {
    id: "t-3", repId: "rep-3", name: "South FL",
    zipCodes: ["33101", "33109"],
    counties: ["Miami-Dade", "Broward"],
    capacityCap: 120, currentLoad: 50, isActive: false,
  },
];

describe("TerritoryPolicy", () => {
  it("assigns lead to matching ZIP territory", () => {
    const result = assignLeadToTerritory("32801", "Orange", territories);
    expect(result.assigned).toBe(true);
    expect(result.territoryId).toBe("t-1");
    expect(result.repId).toBe("rep-1");
  });

  it("assigns lead by county when ZIP not matched", () => {
    const result = assignLeadToTerritory("32999", "Seminole", territories);
    expect(result.assigned).toBe(true);
    expect(result.territoryId).toBe("t-1");
  });

  it("skips territories at capacity", () => {
    const result = assignLeadToTerritory("33601", "Hillsborough", territories);
    expect(result.assigned).toBe(false);
    expect(result.reason).toContain("No matching territory");
  });

  it("skips inactive territories", () => {
    const result = assignLeadToTerritory("33101", "Miami-Dade", territories);
    expect(result.assigned).toBe(false);
  });

  it("returns unassigned when no ZIP or county", () => {
    const result = assignLeadToTerritory(null, null, territories);
    expect(result.assigned).toBe(false);
    expect(result.reason).toContain("No ZIP or county");
  });

  it("checks capacity correctly", () => {
    expect(isAtCapacity(territories[0]!)).toBe(false);
    expect(isAtCapacity(territories[1]!)).toBe(true);
  });

  it("calculates remaining capacity", () => {
    expect(getRemainingCapacity(territories[0]!)).toBe(55);
    expect(getRemainingCapacity(territories[1]!)).toBe(0);
  });
});
