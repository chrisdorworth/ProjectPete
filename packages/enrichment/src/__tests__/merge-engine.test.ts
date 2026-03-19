import { describe, it, expect, vi } from "vitest";
import { createGoldenRecord, shouldMerge, type MergeSource } from "../merge-engine.js";

vi.mock("@meridian/domain", () => {
  return {
    jaroWinkler: (a: string, b: string) => {
      if (a === b) return 1;
      // Simple stub: return high similarity for close strings
      if (a.startsWith(b.slice(0, 3))) return 0.9;
      return 0.3;
    },
    checkDuplicate: (a: { email?: string | null }, b: { email?: string | null }) => {
      // Stub: duplicates share the same email
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        return { isDuplicate: true, matchScore: 0.95, matchReasons: ["exact_email_match"], survivorId: "existing" };
      }
      return { isDuplicate: false, matchScore: 0.1, matchReasons: [], survivorId: null };
    },
  };
});

describe("createGoldenRecord", () => {
  it("merges fields from multiple sources", () => {
    const sources: MergeSource[] = [
      {
        provider: "apollo",
        confidence: 0.85,
        data: { firstName: "John", email: "john@test.com", emailConfidence: 0.9 },
      },
      {
        provider: "hunter",
        confidence: 0.7,
        data: { phone: "4075551234", city: "Orlando", state: "FL" },
      },
    ];

    const record = createGoldenRecord(sources);

    expect(record.firstName).toBe("John");
    expect(record.email).toBe("john@test.com");
    expect(record.emailConfidence).toBe(0.9);
    expect(record.phone).toBe("4075551234");
    expect(record.city).toBe("Orlando");
    expect(record.state).toBe("FL");
  });

  it("higher confidence source wins for conflicting fields", () => {
    const sources: MergeSource[] = [
      {
        provider: "low-conf",
        confidence: 0.5,
        data: { firstName: "Jon", title: "Junior Dev" },
      },
      {
        provider: "high-conf",
        confidence: 0.95,
        data: { firstName: "John", title: "Senior Engineer" },
      },
    ];

    const record = createGoldenRecord(sources);

    // high-conf is sorted first, so its values are set first
    expect(record.firstName).toBe("John");
    expect(record.title).toBe("Senior Engineer");
  });

  it("fills null fields from lower-confidence sources", () => {
    const sources: MergeSource[] = [
      {
        provider: "primary",
        confidence: 0.9,
        data: { firstName: "John", email: "john@test.com" },
      },
      {
        provider: "secondary",
        confidence: 0.6,
        data: { firstName: "Jonathan", cellPhone: "4075559876", company: "Acme Corp" },
      },
    ];

    const record = createGoldenRecord(sources);

    expect(record.firstName).toBe("John"); // primary wins
    expect(record.cellPhone).toBe("4075559876"); // filled from secondary
    expect(record.company).toBe("Acme Corp"); // filled from secondary
  });

  it("handles null fields in source data without overwriting", () => {
    const sources: MergeSource[] = [
      {
        provider: "apollo",
        confidence: 0.85,
        data: { firstName: "John", lastName: null },
      },
      {
        provider: "hunter",
        confidence: 0.7,
        data: { lastName: "Doe" },
      },
    ];

    const record = createGoldenRecord(sources);

    expect(record.firstName).toBe("John");
    expect(record.lastName).toBe("Doe"); // null from apollo doesn't block hunter
  });

  it("returns all-null record for empty sources", () => {
    const record = createGoldenRecord([]);

    expect(record.firstName).toBeNull();
    expect(record.lastName).toBeNull();
    expect(record.email).toBeNull();
    expect(record.phone).toBeNull();
    expect(record.emailConfidence).toBe(0);
  });

  it("handles single source correctly", () => {
    const sources: MergeSource[] = [
      {
        provider: "solo",
        confidence: 0.8,
        data: {
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          emailConfidence: 0.85,
          linkedinUrl: "https://linkedin.com/in/janesmith",
        },
      },
    ];

    const record = createGoldenRecord(sources);

    expect(record.firstName).toBe("Jane");
    expect(record.lastName).toBe("Smith");
    expect(record.email).toBe("jane@example.com");
    expect(record.emailConfidence).toBe(0.85);
    expect(record.linkedinUrl).toBe("https://linkedin.com/in/janesmith");
    expect(record.phone).toBeNull();
  });
});

describe("shouldMerge", () => {
  it("returns true for candidates with matching email", () => {
    const a = { id: "1", fullName: "John Doe", firstName: "John", lastName: "Doe", county: "Orange", email: "john@test.com", phone: null, address: null };
    const b = { id: "2", fullName: "John Doe", firstName: "John", lastName: "Doe", county: "Orange", email: "john@test.com", phone: null, address: null };

    expect(shouldMerge(a, b)).toBe(true);
  });

  it("returns false for candidates with different emails", () => {
    const a = { id: "1", fullName: "John Doe", firstName: "John", lastName: "Doe", county: "Orange", email: "john@test.com", phone: null, address: null };
    const b = { id: "2", fullName: "Jane Smith", firstName: "Jane", lastName: "Smith", county: "Brevard", email: "jane@other.com", phone: null, address: null };

    expect(shouldMerge(a, b)).toBe(false);
  });
});
