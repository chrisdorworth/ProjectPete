export { applyRecencyDecay } from "@meridian/domain";

export function calculateTimeWeightedScore(
  baseScore: number,
  signalDate: Date,
  now: Date = new Date(),
): number {
  const daysSince = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24);
  const decayMultiplier = getDecayMultiplier(daysSince);
  return Math.round(baseScore * decayMultiplier);
}

function getDecayMultiplier(daysSince: number): number {
  if (daysSince <= 7) return 1.0;
  if (daysSince <= 14) return 0.95;
  if (daysSince <= 30) return 0.85;
  if (daysSince <= 60) return 0.70;
  if (daysSince <= 90) return 0.55;
  if (daysSince <= 180) return 0.35;
  return 0.15;
}

export function getMostRecentSignalAge(signalDates: Date[]): number {
  if (signalDates.length === 0) return Infinity;
  const mostRecent = Math.max(...signalDates.map((d) => d.getTime()));
  return (Date.now() - mostRecent) / (1000 * 60 * 60 * 24);
}
