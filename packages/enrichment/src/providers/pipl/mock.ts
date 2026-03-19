import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class PiplMockProvider implements EnrichmentProvider {
  name = "pipl-mock";
  priority = 5;

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    const startTime = Date.now();

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 70));

    const firstName = input.firstName ?? "John";
    const lastName = input.lastName ?? "Doe";

    return {
      success: true,
      fields: {
        email: input.email ?? `${firstName.toLowerCase()}${lastName.toLowerCase()}@gmail.com`,
        emailConfidence: 0.78,
        phone: "3125557890",
        cellPhone: "3125554567",
        homeAddress: "1600 Pennsylvania Ave NW",
        city: "Washington",
        state: input.state ?? "DC",
        zipCode: "20500",
        linkedinUrl: `https://linkedin.com/in/${firstName.toLowerCase()}-${lastName.toLowerCase()}-12345`,
        company: input.company ?? "Global Enterprises",
        title: "VP of Sales",
        industry: "Business Services",
        ageEstimate: 38,
        relatives: [
          `Susan ${lastName} (Spouse)`,
          `James ${lastName} (Parent)`,
        ],
      },
      confidence: 0.78,
      costCents: 6,
      durationMs: Date.now() - startTime,
      error: null,
    };
  }
}
