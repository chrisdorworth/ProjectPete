import { Money } from "@meridian/domain";

export interface WealthInput {
  signalValueCents: bigint;
  propertyValueCents: bigint | null;
  salaryEstimateCents: bigint | null;
  ageEstimate: number | null;
  isProfessional: boolean;
  title: string | null;
  signals: Array<{ type: string; valueCents: bigint }>;
}

export function estimateWealth(input: WealthInput): Money {
  let totalCents = 0n;

  // Signal values
  for (const signal of input.signals) {
    totalCents += signal.valueCents;
  }

  // Property value as proxy for wealth
  if (input.propertyValueCents) {
    // Property typically represents 25-40% of net worth
    totalCents += input.propertyValueCents * 3n;
  }

  // Salary multiplier by age
  if (input.salaryEstimateCents && input.ageEstimate) {
    const yearsSaving = Math.max(0, input.ageEstimate - 25);
    // Rough estimate: save 15% of salary per year
    const estimatedSavings = (input.salaryEstimateCents * BigInt(yearsSaving) * 15n) / 100n;
    if (estimatedSavings > totalCents) {
      totalCents = estimatedSavings;
    }
  }

  // Professional multiplier
  if (input.isProfessional) {
    const professionalBonus = totalCents / 4n;
    totalCents += professionalBonus;
  }

  // Title-based adjustment
  if (input.title) {
    const upperTitle = input.title.toUpperCase();
    if (["CEO", "PRESIDENT", "FOUNDER", "PARTNER", "PRINCIPAL"].some((t) => upperTitle.includes(t))) {
      totalCents = totalCents * 15n / 10n; // 1.5x
    } else if (["VP", "DIRECTOR", "SVP", "EVP"].some((t) => upperTitle.includes(t))) {
      totalCents = totalCents * 12n / 10n; // 1.2x
    }
  }

  return Money.fromCents(totalCents);
}
