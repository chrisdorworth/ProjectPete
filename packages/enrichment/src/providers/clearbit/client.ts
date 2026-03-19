import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class ClearbitProvider implements EnrichmentProvider {
  name = "clearbit";
  priority = 3;

  private apiKey: string;
  private baseUrl = "https://company.clearbit.com/v2";

  constructor() {
    this.apiKey = process.env["CLEARBIT_API_KEY"] ?? "";
  }

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    if (!this.apiKey) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "CLEARBIT_API_KEY not configured" };
    }

    if (!input.company) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "Company name required for Clearbit lookup" };
    }

    const startTime = Date.now();

    try {
      const params = new URLSearchParams({ name: input.company });

      const response = await fetch(`${this.baseUrl}/companies/find?${params.toString()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false, fields: {}, confidence: 0,
          costCents: 0, durationMs: Date.now() - startTime,
          error: `Clearbit API error: ${response.status}`,
        };
      }

      const data = await response.json() as {
        name?: string;
        category?: { industry?: string };
        linkedin?: { handle?: string };
        title?: string;
      };

      return {
        success: true,
        fields: {
          company: data.name ?? input.company,
          industry: data.category?.industry ?? null,
          linkedinUrl: data.linkedin?.handle
            ? `https://linkedin.com/company/${data.linkedin.handle}`
            : null,
          title: data.title ?? null,
        },
        confidence: 0.8,
        costCents: 5,
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
