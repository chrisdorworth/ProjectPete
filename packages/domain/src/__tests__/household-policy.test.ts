import { describe, it, expect } from "vitest";
import {
  checkHouseholdMatch,
  calculateHouseholdValue,
  getHighestScore,
} from "../policies/household-policy.js";

describe("HouseholdPolicy", () => {
  it("matches shared address", () => {
    const result = checkHouseholdMatch(
      { leadId: "a", fullName: "John Smith", lastName: "Smith", homeAddress: "123 Main St", city: "Orlando", state: "FL", zipCode: "32801", relatives: [], coOwnershipProperties: [] },
      { leadId: "b", fullName: "Jane Smith", lastName: "Smith", homeAddress: "123 Main Street", city: "Orlando", state: "FL", zipCode: "32801", relatives: [], coOwnershipProperties: [] },
    );
    expect(result.shouldFormHousehold).toBe(true);
    expect(result.matchReason).toBe("shared_address");
  });

  it("matches Whitepages relatives", () => {
    const result = checkHouseholdMatch(
      { leadId: "a", fullName: "John Smith", lastName: "Smith", homeAddress: null, city: null, state: null, zipCode: null, relatives: ["Jane Smith", "Bob Smith"], coOwnershipProperties: [] },
      { leadId: "b", fullName: "Jane Smith", lastName: "Smith", homeAddress: null, city: null, state: null, zipCode: null, relatives: [], coOwnershipProperties: [] },
    );
    expect(result.shouldFormHousehold).toBe(true);
    expect(result.matchReason).toBe("whitepages_relatives");
  });

  it("matches co-ownership", () => {
    const result = checkHouseholdMatch(
      { leadId: "a", fullName: "John Smith", lastName: "Smith", homeAddress: null, city: null, state: null, zipCode: null, relatives: [], coOwnershipProperties: ["123-Main-32801"] },
      { leadId: "b", fullName: "Jane Smith", lastName: "Smith", homeAddress: null, city: null, state: null, zipCode: null, relatives: [], coOwnershipProperties: ["123-Main-32801"] },
    );
    expect(result.shouldFormHousehold).toBe(true);
    expect(result.matchReason).toBe("co_ownership");
  });

  it("does not match unrelated people", () => {
    const result = checkHouseholdMatch(
      { leadId: "a", fullName: "John Smith", lastName: "Smith", homeAddress: "123 Main St", city: "Orlando", state: "FL", zipCode: "32801", relatives: [], coOwnershipProperties: [] },
      { leadId: "b", fullName: "Bob Jones", lastName: "Jones", homeAddress: "456 Oak Ave", city: "Tampa", state: "FL", zipCode: "33601", relatives: [], coOwnershipProperties: [] },
    );
    expect(result.shouldFormHousehold).toBe(false);
  });

  it("does not match same person", () => {
    const result = checkHouseholdMatch(
      { leadId: "a", fullName: "John Smith", lastName: "Smith", homeAddress: "123 Main St", city: "Orlando", state: "FL", zipCode: "32801", relatives: [], coOwnershipProperties: [] },
      { leadId: "a", fullName: "John Smith", lastName: "Smith", homeAddress: "123 Main St", city: "Orlando", state: "FL", zipCode: "32801", relatives: [], coOwnershipProperties: [] },
    );
    expect(result.shouldFormHousehold).toBe(false);
  });

  it("calculates household value from members", () => {
    const value = calculateHouseholdValue([65000000n, 35000000n, 12000000n]);
    expect(value).toBe(112000000n);
  });

  it("gets highest score", () => {
    expect(getHighestScore([45, 78, 62])).toBe(78);
    expect(getHighestScore([])).toBe(0);
  });
});
