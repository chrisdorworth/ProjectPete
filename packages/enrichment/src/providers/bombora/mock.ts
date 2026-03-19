import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class BomboraMockProvider implements EnrichmentProvider {
  name = "bombora-mock";
  priority = 6;

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    const startTime = Date.now();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 45));

    return {
      success: true,
      fields: {
        company: input.company ?? "Acme Corp",
        industry: "Enterprise Software",
      },
      confidence: 0.72,
      costCents: 8,
      durationMs: Date.now() - startTime,
      error: null,
    };
  }
}
