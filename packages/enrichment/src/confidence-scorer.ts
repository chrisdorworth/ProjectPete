import { Confidence } from "@meridian/domain";

const PROVIDER_BASE_CONFIDENCE: Record<string, number> = {
  apollo: 0.85,
  hunter: 0.80,
  clearbit: 0.75,
  whitepages: 0.70,
  pipl: 0.65,
  bombora: 0.60,
};

export function getProviderConfidence(provider: string, fieldsReturned: number): Confidence {
  const base = PROVIDER_BASE_CONFIDENCE[provider] ?? 0.5;
  const fieldBonus = Math.min(0.1, fieldsReturned * 0.02);
  return Confidence.create(Math.min(1, base + fieldBonus), provider);
}

export function combineConfidences(confidences: Confidence[]): Confidence {
  if (confidences.length === 0) return Confidence.zero("none");
  return confidences.reduce((a, b) => a.combine(b));
}
