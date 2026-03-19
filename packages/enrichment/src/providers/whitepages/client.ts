import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class WhitepagesProvider implements EnrichmentProvider {
  name = "whitepages";
  priority = 4;

  private apiKey: string;
  private baseUrl = "https://proapi.whitepages.com/3.0";

  constructor() {
    this.apiKey = process.env["WHITEPAGES_API_KEY"] ?? "";
  }

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    if (!this.apiKey) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "WHITEPAGES_API_KEY not configured" };
    }

    if (!input.firstName && !input.lastName && !input.fullName) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "Name required for Whitepages lookup" };
    }

    const startTime = Date.now();

    try {
      const params = new URLSearchParams({ api_key: this.apiKey });

      if (input.fullName) {
        params.set("name", input.fullName);
      } else {
        if (input.firstName) params.set("first_name", input.firstName);
        if (input.lastName) params.set("last_name", input.lastName);
      }

      if (input.state) params.set("state", input.state);
      if (input.county) params.set("city", input.county);

      const response = await fetch(`${this.baseUrl}/person?${params.toString()}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false, fields: {}, confidence: 0,
          costCents: 0, durationMs: Date.now() - startTime,
          error: `Whitepages API error: ${response.status}`,
        };
      }

      const data = await response.json() as {
        results?: Array<{
          current_addresses?: Array<{
            street_line_1?: string;
            city?: string;
            state_code?: string;
            postal_code?: string;
          }>;
          phones?: Array<{ phone_number?: string }>;
          age_range?: { low?: number; high?: number };
          associated_people?: Array<{ name?: string; relation?: string }>;
        }>;
      };

      const person = data.results?.[0];
      if (!person) {
        return { success: false, fields: {}, confidence: 0, costCents: 3, durationMs: Date.now() - startTime, error: "No match found" };
      }

      const address = person.current_addresses?.[0];
      const phone = person.phones?.[0];
      const ageLow = person.age_range?.low ?? 0;
      const ageHigh = person.age_range?.high ?? 0;
      const ageEstimate = ageLow && ageHigh ? Math.round((ageLow + ageHigh) / 2) : null;

      const relatives = (person.associated_people ?? [])
        .filter((p) => p.name)
        .map((p) => p.relation ? `${p.name} (${p.relation})` : p.name!);

      return {
        success: true,
        fields: {
          homeAddress: address?.street_line_1 ?? null,
          city: address?.city ?? null,
          state: address?.state_code ?? null,
          zipCode: address?.postal_code ?? null,
          ageEstimate,
          relatives,
          phone: phone?.phone_number ?? null,
        },
        confidence: 0.75,
        costCents: 3,
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
