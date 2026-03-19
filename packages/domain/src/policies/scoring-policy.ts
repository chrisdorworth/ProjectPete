import type { SignalType } from "../value-objects/signal-type.js";
import { getSignalWeight } from "../value-objects/signal-type.js";
import type { ScoreBreakdown } from "../value-objects/score.js";

export interface ScoringInput {
  signals: Array<{
    type: SignalType;
    valueCents: bigint;
    detectedAt: Date;
    confidence: number;
  }>;
  enrichmentCompleteness: number;
  hasEmail: boolean;
  hasCellPhone: boolean;
  hasHomeAddress: boolean;
  hasWarmPath: boolean;
  networkProximity: number | null;
  intentScore: number;
  intentMatchesSignal: boolean;
  householdSize: number;
  householdValueCents: bigint;
  ageEstimate: number | null;
  isProfessional: boolean;
  rapportHookCount: number;
}

const WEIGHT_MATRIX = {
  signalStrength: 0.30,
  estimatedValue: 0.25,
  timing: 0.20,
  accessibility: 0.15,
  complexity: 0.10,
} as const;

const CONVERGENCE_BONUS = 5;
const INTENT_BONUS = 3;
const WARM_PATH_BONUS = 4;

export function calculateQuantitativeScore(input: ScoringInput): {
  score: number;
  breakdown: ScoreBreakdown;
} {
  const signalStrength = calculateSignalStrength(input);
  const estimatedValue = calculateValueScore(input);
  const timing = calculateTimingScore(input);
  const accessibility = calculateAccessibilityScore(input);
  const complexity = calculateComplexityScore(input);

  const convergenceBonus = input.signals.length >= 2 ? CONVERGENCE_BONUS : 0;
  const intentBonus = input.intentMatchesSignal ? INTENT_BONUS : 0;
  const warmPathBonus = input.hasWarmPath ? WARM_PATH_BONUS : 0;

  const baseScore =
    signalStrength * WEIGHT_MATRIX.signalStrength +
    estimatedValue * WEIGHT_MATRIX.estimatedValue +
    timing * WEIGHT_MATRIX.timing +
    accessibility * WEIGHT_MATRIX.accessibility +
    complexity * WEIGHT_MATRIX.complexity;

  const totalScore = Math.min(50, Math.round(baseScore * 50 / 100 + convergenceBonus + intentBonus + warmPathBonus));

  return {
    score: totalScore,
    breakdown: {
      signalStrength: Math.round(signalStrength),
      estimatedValue: Math.round(estimatedValue),
      timing: Math.round(timing),
      accessibility: Math.round(accessibility),
      complexity: Math.round(complexity),
      convergenceBonus,
      intentBonus,
      warmPathBonus,
    },
  };
}

function calculateSignalStrength(input: ScoringInput): number {
  if (input.signals.length === 0) return 0;

  const weights = input.signals.map((s) => getSignalWeight(s.type) * s.confidence);
  const maxWeight = Math.max(...weights);
  const multiSignalBonus = Math.min(20, (input.signals.length - 1) * 10);

  return Math.min(100, maxWeight * 80 + multiSignalBonus);
}

function calculateValueScore(input: ScoringInput): number {
  const maxValue = input.signals.reduce(
    (max, s) => (s.valueCents > max ? s.valueCents : max),
    0n,
  );
  const householdValue = input.householdValueCents;
  const totalValue = maxValue > householdValue ? maxValue : householdValue;

  const dollars = Number(totalValue) / 100;
  if (dollars >= 5_000_000) return 100;
  if (dollars >= 2_000_000) return 85;
  if (dollars >= 1_000_000) return 70;
  if (dollars >= 500_000) return 55;
  if (dollars >= 250_000) return 40;
  if (dollars >= 100_000) return 25;
  return 10;
}

function calculateTimingScore(input: ScoringInput): number {
  if (input.signals.length === 0) return 0;

  const now = Date.now();
  const mostRecent = Math.max(...input.signals.map((s) => s.detectedAt.getTime()));
  const daysSince = (now - mostRecent) / (1000 * 60 * 60 * 24);

  return applyRecencyDecay(daysSince);
}

export function applyRecencyDecay(daysSince: number): number {
  if (daysSince <= 7) return 100;
  if (daysSince <= 14) return 90;
  if (daysSince <= 30) return 75;
  if (daysSince <= 60) return 55;
  if (daysSince <= 90) return 35;
  if (daysSince <= 180) return 20;
  return 10;
}

function calculateAccessibilityScore(input: ScoringInput): number {
  let score = 0;
  if (input.hasEmail) score += 30;
  if (input.hasCellPhone) score += 25;
  if (input.hasHomeAddress) score += 15;
  if (input.enrichmentCompleteness >= 0.8) score += 10;
  if (input.rapportHookCount >= 2) score += 10;
  if (input.hasWarmPath) score += 10;
  return Math.min(100, score);
}

function calculateComplexityScore(input: ScoringInput): number {
  let score = 50;

  if (input.isProfessional) score += 15;
  if (input.ageEstimate !== null) {
    if (input.ageEstimate >= 55 && input.ageEstimate <= 75) score += 20;
    else if (input.ageEstimate >= 45 && input.ageEstimate < 55) score += 10;
  }
  if (input.householdSize >= 2) score += 10;

  return Math.min(100, score);
}
