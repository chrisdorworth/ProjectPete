import { describe, it, expect } from "vitest";
import { checkDuplicate, jaroWinkler } from "../policies/dedup-policy.js";

describe("DedupPolicy", () => {
  it("detects exact email match as duplicate", () => {
    const result = checkDuplicate(
      { id: "a", fullName: "John Smith", firstName: "John", lastName: "Smith", county: "Orange", email: "john@example.com", phone: null, address: null },
      { id: "b", fullName: "John Smith", firstName: "John", lastName: "Smith", county: "Orange", email: "JOHN@Example.com", phone: null, address: null },
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.matchReasons).toContain("exact_email_match");
  });

  it("detects similar name + same county", () => {
    const result = checkDuplicate(
      { id: "a", fullName: "Jonathan Smith", firstName: "Jonathan", lastName: "Smith", county: "Orange", email: null, phone: null, address: null },
      { id: "b", fullName: "John Smith", firstName: "John", lastName: "Smith", county: "Orange", email: null, phone: "4075551234", address: null },
    );
    expect(result.matchScore).toBeGreaterThan(0);
  });

  it("does not match completely different people", () => {
    const result = checkDuplicate(
      { id: "a", fullName: "Alice Johnson", firstName: "Alice", lastName: "Johnson", county: "Orange", email: "alice@test.com", phone: null, address: null },
      { id: "b", fullName: "Bob Williams", firstName: "Bob", lastName: "Williams", county: "Seminole", email: "bob@test.com", phone: null, address: null },
    );
    expect(result.isDuplicate).toBe(false);
  });

  it("matches phone numbers regardless of formatting", () => {
    const result = checkDuplicate(
      { id: "a", fullName: "Jane Doe", firstName: "Jane", lastName: "Doe", county: "Orange", email: null, phone: "(407) 555-1234", address: null },
      { id: "b", fullName: "Jane Doe", firstName: "Jane", lastName: "Doe", county: "Orange", email: null, phone: "4075551234", address: null },
    );
    expect(result.isDuplicate).toBe(true);
    expect(result.matchReasons).toContain("exact_phone_match");
  });

  it("detects address match", () => {
    const result = checkDuplicate(
      { id: "a", fullName: "John Smith", firstName: "John", lastName: "Smith", county: "Orange", email: null, phone: "4075551234", address: "123 Main Street, Apt 4" },
      { id: "b", fullName: "John Smith", firstName: "John", lastName: "Smith", county: "Orange", email: null, phone: null, address: "123 Main St Apt 4" },
    );
    expect(result.matchReasons).toContain("address_match");
  });
});

describe("jaroWinkler", () => {
  it("returns 1 for identical strings", () => {
    expect(jaroWinkler("test", "test")).toBe(1);
  });

  it("returns 0 for empty strings", () => {
    expect(jaroWinkler("", "test")).toBe(0);
    expect(jaroWinkler("test", "")).toBe(0);
  });

  it("returns high score for similar strings", () => {
    expect(jaroWinkler("martha", "marhta")).toBeGreaterThan(0.9);
  });

  it("returns low score for dissimilar strings", () => {
    expect(jaroWinkler("abcdef", "xyz123")).toBeLessThan(0.5);
  });

  it("meets 0.88 threshold for close name variants", () => {
    expect(jaroWinkler("john smith", "john smyth")).toBeGreaterThanOrEqual(0.88);
  });
});
