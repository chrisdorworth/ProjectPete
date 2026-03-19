import { checkHouseholdMatch, type HouseholdCandidate } from "@meridian/domain";

export interface HouseholdLinkResult {
  shouldLink: boolean;
  householdId: string | null;
  matchReason: string | null;
  confidence: number;
}

export function findHouseholdLinks(
  lead: HouseholdCandidate,
  existingLeads: HouseholdCandidate[],
): HouseholdLinkResult[] {
  const results: HouseholdLinkResult[] = [];

  for (const existing of existingLeads) {
    const match = checkHouseholdMatch(lead, existing);
    if (match.shouldFormHousehold) {
      results.push({
        shouldLink: true,
        householdId: null, // Will be created or found
        matchReason: match.matchReason,
        confidence: match.confidence,
      });
    }
  }

  return results;
}
