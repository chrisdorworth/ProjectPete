import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class ApolloProvider implements EnrichmentProvider {
  name = "apollo";
  priority = 1;

  private apiKey: string;
  private baseUrl = "https://api.apollo.io/v1";

  constructor() {
    this.apiKey = process.env["APOLLO_API_KEY"] ?? "";
  }

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    if (!this.apiKey) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "APOLLO_API_KEY not configured" };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/people/match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify({
          first_name: input.firstName,
          last_name: input.lastName,
          name: input.fullName,
          organization_name: input.company,
          email: input.email,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false, fields: {}, confidence: 0,
          costCents: 0, durationMs: Date.now() - startTime,
          error: `Apollo API error: ${response.status}`,
        };
      }

      const data = await response.json() as {
        person?: {
          email?: string;
          phone_numbers?: Array<{ sanitized_number?: string; type?: string }>;
          linkedin_url?: string;
          organization?: { name?: string; industry?: string };
          title?: string;
          city?: string;
          state?: string;
        };
      };

      const person = data.person;
      if (!person) {
        return { success: false, fields: {}, confidence: 0, costCents: 4, durationMs: Date.now() - startTime, error: "No match found" };
      }

      const cellPhone = person.phone_numbers?.find((p) => p.type === "mobile");
      const directPhone = person.phone_numbers?.find((p) => p.type === "direct") ?? person.phone_numbers?.[0];

      return {
        success: true,
        fields: {
          email: person.email ?? null,
          emailConfidence: person.email ? 0.85 : 0,
          phone: directPhone?.sanitized_number ?? null,
          cellPhone: cellPhone?.sanitized_number ?? null,
          linkedinUrl: person.linkedin_url ?? null,
          company: person.organization?.name ?? null,
          title: person.title ?? null,
          industry: person.organization?.industry ?? null,
          city: person.city ?? null,
          state: person.state ?? null,
        },
        confidence: 0.85,
        costCents: 4,
        durationMs: Date.now() - startTime,
        error: null,
      };
    } catch (err) {
      return {
        success: false, fields: {}, confidence: 0,
        costCents: 0, durationMs: Date.now() - startTime,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}
