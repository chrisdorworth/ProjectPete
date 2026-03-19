/**
 * Retention Policy: 12-month review, 24-month hard delete.
 * GDPR/CCPA-ready (RULE-12).
 */

export const RETENTION_REVIEW_MONTHS = 12;
export const RETENTION_HARD_DELETE_MONTHS = 24;

export interface RetentionContext {
  leadId: string;
  status: string;
  lastActivityAt: Date;
  lastContactAt: Date | null;
  createdAt: Date;
  isSuppressed: boolean;
  isConverted: boolean;
  hasActiveOutreach: boolean;
}

export type RetentionAction =
  | { type: "none" }
  | { type: "flag_for_review"; daysSinceActivity: number }
  | { type: "schedule_purge"; scheduledDate: Date }
  | { type: "purge_now"; method: "crypto_shred" | "hard_delete" };

export function evaluateRetention(
  context: RetentionContext,
  now: Date = new Date(),
): RetentionAction {
  if (context.isConverted) {
    return { type: "none" };
  }

  if (context.hasActiveOutreach) {
    return { type: "none" };
  }

  const daysSinceActivity = daysBetween(context.lastActivityAt, now);
  const monthsSinceActivity = daysSinceActivity / 30;

  if (monthsSinceActivity >= RETENTION_HARD_DELETE_MONTHS) {
    return { type: "purge_now", method: "crypto_shred" };
  }

  if (monthsSinceActivity >= RETENTION_REVIEW_MONTHS) {
    const purgeDate = addMonths(context.lastActivityAt, RETENTION_HARD_DELETE_MONTHS);
    return { type: "schedule_purge", scheduledDate: purgeDate };
  }

  if (monthsSinceActivity >= RETENTION_REVIEW_MONTHS - 1) {
    return { type: "flag_for_review", daysSinceActivity };
  }

  return { type: "none" };
}

export function getFieldsToPreserve(): string[] {
  return ["id", "createdAt", "purgedAt"];
}

export function getFieldsToPurge(): string[] {
  return [
    "firstName", "lastName", "fullName", "email", "phone", "cellPhone",
    "homeAddress", "city", "zipCode", "linkedinUrl", "company", "title",
    "summary", "rapportHooks", "warmPaths",
  ];
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
