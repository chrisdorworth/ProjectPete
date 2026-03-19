import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class WhitepagesMockProvider implements EnrichmentProvider {
  name = "whitepages-mock";
  priority = 4;

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    const startTime = Date.now();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 60));

    const lastName = input.lastName ?? "Doe";

    return {
      success: true,
      fields: {
        homeAddress: "742 Evergreen Terrace",
        city: "Springfield",
        state: input.state ?? "IL",
        zipCode: "62704",
        ageEstimate: 42,
        relatives: [
          `Margaret ${lastName} (Spouse)`,
          `Robert ${lastName} (Sibling)`,
          `Patricia ${lastName} (Parent)`,
        ],
        phone: "2175558901",
      },
      confidence: 0.75,
      costCents: 3,
      durationMs: Date.now() - startTime,
      error: null,
    };
  }
}
