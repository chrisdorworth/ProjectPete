import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class ClearbitMockProvider implements EnrichmentProvider {
  name = "clearbit-mock";
  priority = 3;

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    const startTime = Date.now();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 40));

    const company = input.company ?? "Acme Corp";

    return {
      success: true,
      fields: {
        company,
        industry: "Technology",
        linkedinUrl: input.firstName
          ? `https://linkedin.com/in/${input.firstName.toLowerCase()}-${(input.lastName ?? "").toLowerCase()}`
          : null,
        title: "Director of Operations",
      },
      confidence: 0.8,
      costCents: 5,
      durationMs: Date.now() - startTime,
      error: null,
    };
  }
}
