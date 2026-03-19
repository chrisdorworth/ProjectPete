import type { Confidence } from "@meridian/domain";

export interface EnrichmentInput {
  leadId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  company: string | null;
  county: string | null;
  state: string | null;
}

export interface EnrichedData {
  email: string | null;
  emailConfidence: number;
  phone: string | null;
  phoneType: string | null;
  cellPhone: string | null;
  homeAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  linkedinUrl: string | null;
  company: string | null;
  title: string | null;
  industry: string | null;
  ageEstimate: number | null;
  relatives: string[];
  providersUsed: string[];
  fieldsPopulated: string[];
  totalConfidence: number;
  completeness: number;
  totalCostCents: number;
}

export interface EnrichmentProvider {
  name: string;
  priority: number;
  enrich(input: EnrichmentInput): Promise<ProviderResult>;
}

export interface ProviderResult {
  success: boolean;
  fields: Partial<EnrichedData>;
  confidence: number;
  costCents: number;
  durationMs: number;
  error: string | null;
}

export class EnrichmentOrchestrator {
  private providers: EnrichmentProvider[] = [];

  registerProvider(provider: EnrichmentProvider): void {
    this.providers.push(provider);
    this.providers.sort((a, b) => a.priority - b.priority);
  }

  async enrich(input: EnrichmentInput): Promise<EnrichedData> {
    const result: EnrichedData = {
      email: null,
      emailConfidence: 0,
      phone: null,
      phoneType: null,
      cellPhone: null,
      homeAddress: null,
      city: null,
      state: null,
      zipCode: null,
      linkedinUrl: null,
      company: input.company,
      title: null,
      industry: null,
      ageEstimate: null,
      relatives: [],
      providersUsed: [],
      fieldsPopulated: [],
      totalConfidence: 0,
      completeness: 0,
      totalCostCents: 0,
    };

    for (const provider of this.providers) {
      // Short-circuit: if we have email + phone + address, skip remaining
      if (result.email && result.cellPhone && result.homeAddress && result.linkedinUrl) {
        break;
      }

      try {
        const providerResult = await provider.enrich(input);
        if (providerResult.success) {
          mergeFields(result, providerResult.fields);
          result.providersUsed.push(provider.name);
          result.totalCostCents += providerResult.costCents;
        }
      } catch {
        // Circuit breaker handled at provider level
      }
    }

    result.fieldsPopulated = getPopulatedFields(result);
    result.completeness = result.fieldsPopulated.length / 12; // 12 key fields
    result.totalConfidence = calculateTotalConfidence(result);

    return result;
  }
}

function mergeFields(target: EnrichedData, source: Partial<EnrichedData>): void {
  for (const [key, value] of Object.entries(source)) {
    if (value !== null && value !== undefined) {
      const targetValue = (target as Record<string, unknown>)[key];
      if (targetValue === null || targetValue === undefined || targetValue === 0 || targetValue === "") {
        (target as Record<string, unknown>)[key] = value;
      }
    }
  }

  if (source.relatives && source.relatives.length > 0) {
    const existingSet = new Set(target.relatives);
    for (const relative of source.relatives) {
      if (!existingSet.has(relative)) {
        target.relatives.push(relative);
      }
    }
  }
}

function getPopulatedFields(data: EnrichedData): string[] {
  const fields: string[] = [];
  if (data.email) fields.push("email");
  if (data.phone) fields.push("phone");
  if (data.cellPhone) fields.push("cellPhone");
  if (data.homeAddress) fields.push("homeAddress");
  if (data.city) fields.push("city");
  if (data.state) fields.push("state");
  if (data.zipCode) fields.push("zipCode");
  if (data.linkedinUrl) fields.push("linkedinUrl");
  if (data.company) fields.push("company");
  if (data.title) fields.push("title");
  if (data.industry) fields.push("industry");
  if (data.ageEstimate) fields.push("ageEstimate");
  return fields;
}

function calculateTotalConfidence(data: EnrichedData): number {
  const fieldCount = getPopulatedFields(data).length;
  if (fieldCount === 0) return 0;

  let confidenceSum = 0;
  if (data.email) confidenceSum += data.emailConfidence;
  if (data.phone) confidenceSum += 0.7;
  if (data.cellPhone) confidenceSum += 0.8;
  if (data.homeAddress) confidenceSum += 0.75;

  return Math.min(1, confidenceSum / Math.max(1, fieldCount));
}
