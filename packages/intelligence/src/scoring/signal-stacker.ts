import type { SignalType } from "@meridian/domain";
import { getSignalWeight, getSignalTier } from "@meridian/domain";

export interface StackedSignal {
  type: SignalType;
  detectedAt: Date;
  valueCents: bigint;
  confidence: number;
}

export interface StackingResult {
  isConverging: boolean;
  convergenceScore: number;
  signalCount: number;
  uniqueTypes: number;
  highestTier: number;
  totalValueCents: bigint;
  weightedScore: number;
  description: string;
}

const CONVERGENCE_WINDOW_DAYS = 180;

export function analyzeSignalStack(signals: StackedSignal[]): StackingResult {
  if (signals.length === 0) {
    return {
      isConverging: false,
      convergenceScore: 0,
      signalCount: 0,
      uniqueTypes: 0,
      highestTier: 4,
      totalValueCents: 0n,
      weightedScore: 0,
      description: "No signals",
    };
  }

  const now = Date.now();
  const recentSignals = signals.filter(
    (s) => (now - s.detectedAt.getTime()) / 86400000 <= CONVERGENCE_WINDOW_DAYS,
  );

  const uniqueTypes = new Set(recentSignals.map((s) => s.type));
  const tiers = recentSignals.map((s) => getSignalTier(s.type));
  const highestTier = Math.min(...tiers);
  const totalValue = recentSignals.reduce((sum, s) => sum + s.valueCents, 0n);

  const weightedScore = recentSignals.reduce(
    (sum, s) => sum + getSignalWeight(s.type) * s.confidence,
    0,
  ) / Math.max(1, recentSignals.length);

  const isConverging = recentSignals.length >= 2 && uniqueTypes.size >= 2;

  let convergenceScore = 0;
  if (isConverging) {
    convergenceScore = Math.min(100,
      recentSignals.length * 15 +
      uniqueTypes.size * 10 +
      (highestTier === 1 ? 20 : highestTier === 2 ? 10 : 0),
    );
  }

  const descriptions: string[] = [];
  if (isConverging) descriptions.push(`${uniqueTypes.size} signal types converging`);
  if (highestTier === 1) descriptions.push("Tier 1 government source");
  if (totalValue > 1000000n) descriptions.push(`$${(Number(totalValue) / 100).toLocaleString()} estimated`);

  return {
    isConverging,
    convergenceScore,
    signalCount: recentSignals.length,
    uniqueTypes: uniqueTypes.size,
    highestTier,
    totalValueCents: totalValue,
    weightedScore: Math.round(weightedScore * 100) / 100,
    description: descriptions.join("; ") || "Single signal",
  };
}
