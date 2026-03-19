import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class ApolloMockProvider implements EnrichmentProvider {
  name = "apollo-mock";
  priority = 1;

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    const startTime = Date.now();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      fields: {
        email: input.firstName && input.lastName
          ? `${input.firstName.toLowerCase()}.${input.lastName.toLowerCase()}@example.com`
          : null,
        emailConfidence: 0.85,
        phone: "4075551234",
        cellPhone: "4075559876",
        linkedinUrl: input.firstName ? `https://linkedin.com/in/${input.firstName.toLowerCase()}-${(input.lastName ?? "").toLowerCase()}` : null,
        company: input.company ?? "Acme Corp",
        title: "Senior Executive",
        industry: "Financial Services",
        city: "Orlando",
        state: "FL",
      },
      confidence: 0.85,
      costCents: 4,
      durationMs: Date.now() - startTime,
      error: null,
    };
  }
}
