import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class HunterMockProvider implements EnrichmentProvider {
  name = "hunter-mock";
  priority = 2;

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    const startTime = Date.now();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 30));

    const email = input.email
      ?? (input.firstName && input.lastName
        ? `${input.firstName.toLowerCase()}.${input.lastName.toLowerCase()}@example.com`
        : null);

    return {
      success: true,
      fields: {
        email,
        emailConfidence: 0.92,
      },
      confidence: 0.92,
      costCents: 1,
      durationMs: Date.now() - startTime,
      error: null,
    };
  }
}
