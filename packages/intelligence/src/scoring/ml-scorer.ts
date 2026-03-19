const ML_SERVICE_URL = process.env["ML_SERVICE_URL"] ?? "http://localhost:8000";

export interface MLScoreInput {
  signalCount: number;
  signalValueCents: number;
  signalRecencyDays: number | null;
  multiSignalFlag: boolean;
  enrichmentCompleteness: number;
  emailConfidence: number;
  hasCellPhone: boolean;
  hasHomeAddress: boolean;
  networkProximity: number | null;
  hasWarmPath: boolean;
  intentScore: number;
  intentKeywordMatch: boolean;
  householdSize: number;
  householdValueCents: number;
  ageEstimate: number | null;
  isProfessional: boolean;
  almaMaterTier: number | null;
  rapportHookCount: number;
}

export interface MLScoreResult {
  score: number;
  modelVersion: string;
}

export async function getMLScore(input: MLScoreInput): Promise<MLScoreResult> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signal_count: input.signalCount,
      signal_value_cents: input.signalValueCents,
      signal_recency_days: input.signalRecencyDays,
      multi_signal_flag: input.multiSignalFlag,
      enrichment_completeness: input.enrichmentCompleteness,
      email_confidence: input.emailConfidence,
      has_cell_phone: input.hasCellPhone,
      has_home_address: input.hasHomeAddress,
      network_proximity: input.networkProximity,
      has_warm_path: input.hasWarmPath,
      intent_score: input.intentScore,
      intent_keyword_match: input.intentKeywordMatch,
      household_size: input.householdSize,
      household_value_cents: input.householdValueCents,
      age_estimate: input.ageEstimate,
      is_professional: input.isProfessional,
      alma_mater_tier: input.almaMaterTier,
      rapport_hook_count: input.rapportHookCount,
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`ML service error: ${response.status}`);
  }

  const data = await response.json() as { score: number; model_version: string };
  return {
    score: data.score,
    modelVersion: data.model_version,
  };
}
