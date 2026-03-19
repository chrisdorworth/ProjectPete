import type { CompositeScore, ScoreBreakdown } from "@meridian/domain";
import { calculateQuantitativeScore, type ScoringInput } from "@meridian/domain";

export interface EnsembleResult {
  compositeScore: number;
  qualitativeScore: number;
  quantitativeScore: number;
  breakdown: ScoreBreakdown;
  method: "rule_based" | "ml_ensemble";
  modelVersion: string;
}

const ML_SERVICE_URL = process.env["ML_SERVICE_URL"] ?? "http://localhost:8000";
const ML_WEIGHT = 0.6;
const QUALITATIVE_WEIGHT = 0.4;

export async function ensembleScore(
  input: ScoringInput,
  claudeQualitativeScore: number,
  useML: boolean,
): Promise<EnsembleResult> {
  const { score: quantScore, breakdown } = calculateQuantitativeScore(input);

  if (!useML) {
    const composite = Math.min(100, Math.round(claudeQualitativeScore + quantScore));
    return {
      compositeScore: composite,
      qualitativeScore: Math.min(50, claudeQualitativeScore),
      quantitativeScore: quantScore,
      breakdown,
      method: "rule_based",
      modelVersion: "rule-v1",
    };
  }

  try {
    const mlScore = await fetchMLScore(input);
    const mlQuantScore = Math.round(mlScore * 50);
    const ensembledQuant = Math.round(mlQuantScore * ML_WEIGHT + quantScore * (1 - ML_WEIGHT));
    const composite = Math.min(100, claudeQualitativeScore + ensembledQuant);

    return {
      compositeScore: composite,
      qualitativeScore: Math.min(50, claudeQualitativeScore),
      quantitativeScore: ensembledQuant,
      breakdown,
      method: "ml_ensemble",
      modelVersion: mlScore.toString(),
    };
  } catch {
    // Fallback to rule-based
    const composite = Math.min(100, Math.round(claudeQualitativeScore + quantScore));
    return {
      compositeScore: composite,
      qualitativeScore: Math.min(50, claudeQualitativeScore),
      quantitativeScore: quantScore,
      breakdown,
      method: "rule_based",
      modelVersion: "rule-v1-fallback",
    };
  }
}

async function fetchMLScore(input: ScoringInput): Promise<number> {
  const response = await fetch(`${ML_SERVICE_URL}/predict/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      signal_count: input.signals.length,
      signal_value_cents: Number(input.signals[0]?.valueCents ?? 0n),
      signal_recency_days: input.signals[0] ? Math.floor((Date.now() - input.signals[0].detectedAt.getTime()) / 86400000) : null,
      multi_signal_flag: input.signals.length >= 2,
      enrichment_completeness: input.enrichmentCompleteness,
      has_cell_phone: input.hasCellPhone,
      has_home_address: input.hasHomeAddress,
      has_warm_path: input.hasWarmPath,
      network_proximity: input.networkProximity,
      intent_score: input.intentScore,
      intent_keyword_match: input.intentMatchesSignal,
      household_size: input.householdSize,
      household_value_cents: Number(input.householdValueCents),
      age_estimate: input.ageEstimate,
      is_professional: input.isProfessional,
      rapport_hook_count: input.rapportHookCount,
    }),
    signal: AbortSignal.timeout(5000),
  });

  const data = await response.json() as { score: number };
  return data.score / 100;
}
