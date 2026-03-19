import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class HunterProvider implements EnrichmentProvider {
  name = "hunter";
  priority = 2;

  private apiKey: string;
  private baseUrl = "https://api.hunter.io/v2";

  constructor() {
    this.apiKey = process.env["HUNTER_API_KEY"] ?? "";
  }

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    if (!this.apiKey) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "HUNTER_API_KEY not configured" };
    }

    if (!input.email) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "Email required for Hunter verification" };
    }

    const startTime = Date.now();

    try {
      const params = new URLSearchParams({
        email: input.email,
        api_key: this.apiKey,
      });

      const response = await fetch(`${this.baseUrl}/email-verifier?${params.toString()}`, {
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
          error: `Hunter API error: ${response.status}`,
        };
      }

      const data = await response.json() as {
        data?: {
          status?: string;
          score?: number;
          email?: string;
          first_name?: string;
          last_name?: string;
        };
      };

      const result = data.data;
      if (!result) {
        return { success: false, fields: {}, confidence: 0, costCents: 1, durationMs: Date.now() - startTime, error: "No verification result" };
      }

      const isValid = result.status === "valid" || result.status === "accept_all";
      const score = result.score ?? 0;
      const confidence = score / 100;

      return {
        success: true,
        fields: {
          email: isValid ? (result.email ?? input.email) : null,
          emailConfidence: confidence,
        },
        confidence,
        costCents: 1,
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
