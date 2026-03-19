import type { EnrichmentProvider, EnrichmentInput, ProviderResult } from "../../orchestrator.js";

export class PiplProvider implements EnrichmentProvider {
  name = "pipl";
  priority = 5;

  private apiKey: string;
  private baseUrl = "https://api.pipl.com/search";

  constructor() {
    this.apiKey = process.env["PIPL_API_KEY"] ?? "";
  }

  async enrich(input: EnrichmentInput): Promise<ProviderResult> {
    if (!this.apiKey) {
      return { success: false, fields: {}, confidence: 0, costCents: 0, durationMs: 0, error: "PIPL_API_KEY not configured" };
    }

    const startTime = Date.now();

    try {
      const body: Record<string, unknown> = { key: this.apiKey };

      if (input.email) body.email = input.email;
      if (input.firstName) body.first_name = input.firstName;
      if (input.lastName) body.last_name = input.lastName;
      if (input.fullName) body.raw_name = input.fullName;
      if (input.state) body.state = input.state;

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false, fields: {}, confidence: 0,
          costCents: 0, durationMs: Date.now() - startTime,
          error: `Pipl API error: ${response.status}`,
        };
      }

      const data = await response.json() as {
        person?: {
          emails?: Array<{ address?: string }>;
          phones?: Array<{ display?: string; type?: string }>;
          addresses?: Array<{
            display?: string;
            city?: string;
            state?: string;
            zip_code?: string;
          }>;
          jobs?: Array<{ title?: string; organization?: string; industry?: string }>;
          urls?: Array<{ url?: string; domain?: string }>;
          dob?: { date_range?: { start?: string; end?: string } };
          relationships?: Array<{ names?: Array<{ display?: string }>; type?: string }>;
        };
      };

      const person = data.person;
      if (!person) {
        return { success: false, fields: {}, confidence: 0, costCents: 6, durationMs: Date.now() - startTime, error: "No match found" };
      }

      const email = person.emails?.[0]?.address ?? null;
      const cellPhone = person.phones?.find((p) => p.type === "mobile")?.display ?? null;
      const phone = person.phones?.[0]?.display ?? null;
      const address = person.addresses?.[0];
      const job = person.jobs?.[0];
      const linkedinUrl = person.urls?.find((u) => u.domain === "linkedin.com")?.url ?? null;

      let ageEstimate: number | null = null;
      if (person.dob?.date_range?.start) {
        const birthYear = new Date(person.dob.date_range.start).getFullYear();
        ageEstimate = new Date().getFullYear() - birthYear;
      }

      const relatives = (person.relationships ?? [])
        .flatMap((r) =>
          (r.names ?? [])
            .filter((n) => n.display)
            .map((n) => r.type ? `${n.display} (${r.type})` : n.display!),
        );

      return {
        success: true,
        fields: {
          email,
          emailConfidence: email ? 0.78 : 0,
          phone,
          cellPhone,
          homeAddress: address?.display ?? null,
          city: address?.city ?? null,
          state: address?.state ?? null,
          zipCode: address?.zip_code ?? null,
          linkedinUrl,
          company: job?.organization ?? null,
          title: job?.title ?? null,
          industry: job?.industry ?? null,
          ageEstimate,
          relatives,
        },
        confidence: 0.78,
        costCents: 6,
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
