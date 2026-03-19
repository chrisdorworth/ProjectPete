import type { SignalType } from "@meridian/domain";

const INTENT_SIGNAL_MAPPING: Record<string, SignalType[]> = {
  financial_planning: ["deed_transfer", "probate_filing", "professional_retirement", "linkedin_retirement"],
  wealth_management: ["sec_form4", "sec_form_d", "business_dissolution", "news_liquidity_event"],
  retirement_planning: ["professional_retirement", "linkedin_retirement", "pension_eligible", "social_retirement_post"],
  estate_planning: ["probate_filing", "deed_transfer", "divorce_filing"],
  tax_planning: ["sec_form4", "business_dissolution", "commercial_re_sale"],
  insurance: ["business_merger", "court_settlement"],
  investment: ["sec_13f", "patent_assignment", "auction_consignment"],
};

export interface IntentCorrelation {
  matches: boolean;
  matchedTopics: string[];
  correlationScore: number;
}

export function correlateIntent(
  intentKeywords: string[],
  signalTypes: SignalType[],
): IntentCorrelation {
  const matchedTopics: string[] = [];

  for (const keyword of intentKeywords) {
    const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, "_");
    const mappedSignals = INTENT_SIGNAL_MAPPING[normalizedKeyword];
    if (!mappedSignals) continue;

    const hasMatch = signalTypes.some((st) => mappedSignals.includes(st));
    if (hasMatch) {
      matchedTopics.push(normalizedKeyword);
    }
  }

  const correlationScore = matchedTopics.length > 0
    ? Math.min(100, matchedTopics.length * 30 + 20)
    : 0;

  return {
    matches: matchedTopics.length > 0,
    matchedTopics,
    correlationScore,
  };
}
