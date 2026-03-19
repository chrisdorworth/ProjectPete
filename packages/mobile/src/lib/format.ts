/**
 * Format cents (integer) to a dollar string.
 * Uses integer arithmetic only to avoid floating-point drift.
 */
export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const absCents = Math.abs(Math.trunc(cents));
  const dollars = Math.trunc(absCents / 100);
  const remainder = absCents % 100;

  const formatted = dollars.toLocaleString("en-US");
  const paddedRemainder = String(remainder).padStart(2, "0");

  return `${sign}$${formatted}.${paddedRemainder}`;
}

/**
 * Format cents to a compact dollar string (e.g., $1.2M, $450K).
 */
export function formatMoneyCompact(cents: number): string {
  const dollars = Math.trunc(cents / 100);
  const absDollars = Math.abs(dollars);
  const sign = dollars < 0 ? "-" : "";

  if (absDollars >= 1_000_000) {
    const millions = absDollars / 1_000_000;
    return `${sign}$${millions.toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (absDollars >= 1_000) {
    const thousands = absDollars / 1_000;
    return `${sign}$${thousands.toFixed(1).replace(/\.0$/, "")}K`;
  }
  return formatMoney(cents);
}

/**
 * Format a lead score (0-100) with a text label.
 */
export function formatScore(score: number): string {
  if (score >= 80) return `${score} - Hot`;
  if (score >= 60) return `${score} - Warm`;
  if (score >= 40) return `${score} - Cool`;
  return `${score} - Cold`;
}

/**
 * Get the color key for a given score.
 */
export function scoreColor(score: number): "red" | "amber" | "green" | "blue" {
  if (score >= 80) return "blue";
  if (score >= 60) return "green";
  if (score >= 40) return "amber";
  return "red";
}

/**
 * Format an ISO date string to a human-readable date.
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format an ISO date string to a human-readable date and time.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format relative time (e.g., "2m ago", "3h ago", "1d ago").
 */
export function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "\u2026";
}
