import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class BomboraProvider implements EnrichmentProvider {
  name = "bombora";
  priority = 6;

  private apiKey: string;
  private baseUrl = "https://api.bombora.com/v1";

  constructor() {
    this.apiKey = process.env["BOMBORA_API_KEY"] ?? "";
  }

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    if (!this.apiKey) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "BOMBORA_API_KEY not configured" };
    }

    if (!input.company) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "Company name required for Bombora intent lookup" };
    }

    const startTime = Date.now();

    try {
      const response = await fetch(`${this.baseUrl}/surge/company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          company_name: input.company,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false, fields: {}, confidence: 0,
          costCents: 0, durationMs: Date.now() - startTime,
          error: `Bombora API error: ${response.status}`,
        };
      }

      const data = await response.json() as {
        results?: Array<{
          topic_name?: string;
          composite_score?: number;
          company_name?: string;
          industry?: string;
        }>;
      };

      const results = data.results ?? [];
      if (results.length === 0) {
        return { success: false, fields: {}, confidence: 0, costCents: 8, durationMs: Date.now() - startTime, error: "No intent signals found" };
      }

      const topResult = results.reduce((a, b) =>
        (b.composite_score ?? 0) > (a.composite_score ?? 0) ? b : a,
      );

      return {
        success: true,
        fields: {
          company: topResult.company_name ?? input.company,
          industry: topResult.industry ?? null,
        },
        confidence: Math.min(1, (topResult.composite_score ?? 50) / 100),
        costCents: 8,
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
