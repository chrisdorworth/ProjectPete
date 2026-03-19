import { describe, it, expect } from "vitest";
import { ApolloMockProvider } from "../providers/apollo/mock.js";
import type { EnrichmentInput } from "../orchestrator.js";

function makeInput(overrides: Partial<EnrichmentInput> = {}): EnrichmentInput {
  return {
    leadId: "lead-001",
    firstName: "John",
    lastName: "Doe",
    fullName: "John Doe",
    email: null,
    company: null,
    county: "Orange",
    state: "FL",
    ...overrides,
  };
}

describe("ApolloMockProvider", () => {
  it("returns expected enrichment fields", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput());

    expect(result.success).toBe(true);
    expect(result.fields.phone).toBe("4075551234");
    expect(result.fields.cellPhone).toBe("4075559876");
    expect(result.fields.title).toBe("Senior Executive");
    expect(result.fields.industry).toBe("Financial Services");
    expect(result.fields.city).toBe("Orlando");
    expect(result.fields.state).toBe("FL");
  });

  it("generates email from first and last name", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput({ firstName: "Jane", lastName: "Smith" }));

    expect(result.fields.email).toBe("jane.smith@example.com");
  });

  it("returns null email when name is missing", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput({ firstName: null, lastName: "Doe" }));

    expect(result.fields.email).toBeNull();
  });

  it("generates LinkedIn URL from name", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput({ firstName: "Alice", lastName: "Wonder" }));

    expect(result.fields.linkedinUrl).toBe("https://linkedin.com/in/alice-wonder");
  });

  it("returns null LinkedIn URL when firstName is missing", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput({ firstName: null }));

    expect(result.fields.linkedinUrl).toBeNull();
  });

  it("reports confidence of 0.85", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput());

    expect(result.confidence).toBe(0.85);
    expect(result.fields.emailConfidence).toBe(0.85);
  });

  it("tracks cost at 4 cents per call", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput());

    expect(result.costCents).toBe(4);
  });

  it("tracks duration in milliseconds", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput());

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.durationMs).toBe("number");
  });

  it("has name 'apollo-mock' and priority 1", () => {
    const provider = new ApolloMockProvider();

    expect(provider.name).toBe("apollo-mock");
    expect(provider.priority).toBe(1);
  });

  it("uses input company when provided", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput({ company: "My Corp" }));

    expect(result.fields.company).toBe("My Corp");
  });

  it("defaults company to 'Acme Corp' when not provided", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput({ company: null }));

    expect(result.fields.company).toBe("Acme Corp");
  });

  it("returns no error", async () => {
    const provider = new ApolloMockProvider();
    const result = await provider.enrich(makeInput());

    expect(result.error).toBeNull();
  });
});
