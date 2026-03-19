import { describe, it, expect, vi } from "vitest";
import {
  EnrichmentOrchestrator,
  type EnrichmentProvider,
  type EnrichmentInput,
  type ProviderResult,
} from "../orchestrator.js";

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

function makeProvider(
  name: string,
  priority: number,
  result: Partial<ProviderResult>,
): EnrichmentProvider {
  return {
    name,
    priority,
    enrich: vi.fn().mockResolvedValue({
      success: true,
      fields: {},
      confidence: 0.8,
      costCents: 5,
      durationMs: 100,
      error: null,
      ...result,
    }),
  };
}

describe("EnrichmentOrchestrator", () => {
  it("executes providers sequentially in priority order", async () => {
    const orchestrator = new EnrichmentOrchestrator();
    const callOrder: string[] = [];

    const providerA: EnrichmentProvider = {
      name: "provider-a",
      priority: 2,
      enrich: vi.fn().mockImplementation(async () => {
        callOrder.push("a");
        return {
          success: true,
          fields: { title: "Engineer" },
          confidence: 0.7,
          costCents: 3,
          durationMs: 50,
          error: null,
        };
      }),
    };

    const providerB: EnrichmentProvider = {
      name: "provider-b",
      priority: 1,
      enrich: vi.fn().mockImplementation(async () => {
        callOrder.push("b");
        return {
          success: true,
          fields: { industry: "Tech" },
          confidence: 0.8,
          costCents: 4,
          durationMs: 60,
          error: null,
        };
      }),
    };

    orchestrator.registerProvider(providerA);
    orchestrator.registerProvider(providerB);

    await orchestrator.enrich(makeInput());

    // priority 1 (B) runs before priority 2 (A)
    expect(callOrder).toEqual(["b", "a"]);
  });

  it("short-circuits when all key fields are filled", async () => {
    const orchestrator = new EnrichmentOrchestrator();

    const first = makeProvider("first", 1, {
      fields: {
        email: "john@test.com",
        emailConfidence: 0.9,
        cellPhone: "4075551234",
        homeAddress: "123 Main St",
        linkedinUrl: "https://linkedin.com/in/johndoe",
      },
      costCents: 10,
    });

    const second = makeProvider("second", 2, {
      fields: { title: "CEO" },
      costCents: 5,
    });

    orchestrator.registerProvider(first);
    orchestrator.registerProvider(second);

    const result = await orchestrator.enrich(makeInput());

    expect(first.enrich).toHaveBeenCalledTimes(1);
    expect(second.enrich).not.toHaveBeenCalled();
    expect(result.totalCostCents).toBe(10);
  });

  it("merges fields from multiple providers without overwriting", async () => {
    const orchestrator = new EnrichmentOrchestrator();

    const emailProvider = makeProvider("email-provider", 1, {
      fields: {
        email: "john@test.com",
        emailConfidence: 0.9,
        title: "Manager",
      },
      costCents: 4,
    });

    const phoneProvider = makeProvider("phone-provider", 2, {
      fields: {
        phone: "4075551111",
        cellPhone: "4075552222",
        title: "Director", // should NOT overwrite Manager
      },
      costCents: 3,
    });

    orchestrator.registerProvider(emailProvider);
    orchestrator.registerProvider(phoneProvider);

    const result = await orchestrator.enrich(makeInput());

    expect(result.email).toBe("john@test.com");
    expect(result.phone).toBe("4075551111");
    expect(result.cellPhone).toBe("4075552222");
    expect(result.title).toBe("Manager"); // first provider wins
    expect(result.providersUsed).toEqual(["email-provider", "phone-provider"]);
  });

  it("calculates completeness as fraction of 12 key fields", async () => {
    const orchestrator = new EnrichmentOrchestrator();

    const provider = makeProvider("full-provider", 1, {
      fields: {
        email: "john@test.com",
        emailConfidence: 0.85,
        phone: "4075551234",
        cellPhone: "4075559876",
        homeAddress: "123 Main St",
        city: "Orlando",
        state: "FL",
        zipCode: "32801",
      },
      costCents: 10,
    });

    orchestrator.registerProvider(provider);
    const result = await orchestrator.enrich(makeInput());

    // 7 key fields from provider (email, phone, cellPhone, homeAddress, city, state, zipCode)
    // emailConfidence is not a key field. Company comes from input if set.
    expect(result.completeness).toBeCloseTo(result.fieldsPopulated.length / 12, 5);
    expect(result.fieldsPopulated.length).toBeGreaterThanOrEqual(7);
  });

  it("handles provider failures gracefully", async () => {
    const orchestrator = new EnrichmentOrchestrator();

    const failingProvider: EnrichmentProvider = {
      name: "failing",
      priority: 1,
      enrich: vi.fn().mockRejectedValue(new Error("Network timeout")),
    };

    const workingProvider = makeProvider("working", 2, {
      fields: { email: "john@test.com", emailConfidence: 0.8 },
      costCents: 5,
    });

    orchestrator.registerProvider(failingProvider);
    orchestrator.registerProvider(workingProvider);

    const result = await orchestrator.enrich(makeInput());

    expect(result.email).toBe("john@test.com");
    expect(result.providersUsed).toEqual(["working"]);
    expect(result.totalCostCents).toBe(5);
  });

  it("tracks cumulative cost across providers", async () => {
    const orchestrator = new EnrichmentOrchestrator();

    orchestrator.registerProvider(
      makeProvider("p1", 1, { fields: { email: "a@b.com", emailConfidence: 0.8 }, costCents: 4 }),
    );
    orchestrator.registerProvider(
      makeProvider("p2", 2, { fields: { phone: "1234567890" }, costCents: 7 }),
    );
    orchestrator.registerProvider(
      makeProvider("p3", 3, { fields: { city: "Orlando" }, costCents: 2 }),
    );

    const result = await orchestrator.enrich(makeInput());

    expect(result.totalCostCents).toBe(4 + 7 + 2);
  });

  it("returns empty enrichment for empty provider list", async () => {
    const orchestrator = new EnrichmentOrchestrator();
    const result = await orchestrator.enrich(makeInput());

    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.providersUsed).toEqual([]);
    expect(result.fieldsPopulated).toEqual([]);
    expect(result.completeness).toBe(0);
    expect(result.totalConfidence).toBe(0);
    expect(result.totalCostCents).toBe(0);
  });

  it("returns empty enrichment when all providers fail", async () => {
    const orchestrator = new EnrichmentOrchestrator();

    orchestrator.registerProvider({
      name: "fail-1",
      priority: 1,
      enrich: vi.fn().mockRejectedValue(new Error("fail")),
    });
    orchestrator.registerProvider({
      name: "fail-2",
      priority: 2,
      enrich: vi.fn().mockRejectedValue(new Error("fail")),
    });

    const result = await orchestrator.enrich(makeInput());

    expect(result.providersUsed).toEqual([]);
    expect(result.totalCostCents).toBe(0);
    expect(result.completeness).toBe(0);
    expect(result.totalConfidence).toBe(0);
  });

  it("does not count unsuccessful provider results", async () => {
    const orchestrator = new EnrichmentOrchestrator();

    const unsuccessfulProvider = makeProvider("bad", 1, {
      success: false,
      fields: { email: "nope@test.com" },
      costCents: 3,
    });

    orchestrator.registerProvider(unsuccessfulProvider);

    const result = await orchestrator.enrich(makeInput());

    expect(result.email).toBeNull();
    expect(result.providersUsed).toEqual([]);
    expect(result.totalCostCents).toBe(0);
  });

  it("preserves company from input when no provider overrides it", async () => {
    const orchestrator = new EnrichmentOrchestrator();
    const result = await orchestrator.enrich(makeInput({ company: "Acme Inc" }));

    expect(result.company).toBe("Acme Inc");
  });
});
