export const SignalTypes = {
  // Tier 1 — Government
  DEED_TRANSFER: "deed_transfer",
  SEC_FORM4: "sec_form4",
  SEC_FORM_D: "sec_form_d",
  SEC_13F: "sec_13f",
  PROBATE_FILING: "probate_filing",
  BUSINESS_DISSOLUTION: "business_dissolution",
  BUSINESS_MERGER: "business_merger",
  HOMESTEAD_CHANGE: "homestead_change",
  PROPERTY_VALUE_CHANGE: "property_value_change",
  DIVORCE_FILING: "divorce_filing",

  // Tier 2 — Regulatory
  BANKRUPTCY_EMERGENCE: "bankruptcy_emergence",
  COURT_SETTLEMENT: "court_settlement",
  PROFESSIONAL_RETIREMENT: "professional_retirement",
  LICENSE_SURRENDER: "license_surrender",
  PENSION_ELIGIBLE: "pension_eligible",
  HIGH_SALARY: "high_salary",
  TSP_CONTRIBUTION: "tsp_contribution",
  PATENT_ASSIGNMENT: "patent_assignment",

  // Tier 3 — Commercial
  NEWS_LIQUIDITY_EVENT: "news_liquidity_event",
  NEWS_EXECUTIVE_CHANGE: "news_executive_change",
  NEWS_ACQUISITION: "news_acquisition",
  LINKEDIN_STATUS_CHANGE: "linkedin_status_change",
  LINKEDIN_RETIREMENT: "linkedin_retirement",
  COMMERCIAL_RE_SALE: "commercial_re_sale",
  AUCTION_CONSIGNMENT: "auction_consignment",

  // Tier 4 — Behavioral
  INTENT_SURGE: "intent_surge",
  INTENT_RESEARCH: "intent_research",
  SOCIAL_RETIREMENT_POST: "social_retirement_post",
  SOCIAL_LIFE_EVENT: "social_life_event",
} as const;

export type SignalType = (typeof SignalTypes)[keyof typeof SignalTypes];

export interface SignalTypeMetadata {
  label: string;
  icon: string;
  color: string;
  tier: 1 | 2 | 3 | 4;
  baseWeight: number;
  description: string;
}

export const SIGNAL_METADATA: Record<SignalType, SignalTypeMetadata> = {
  deed_transfer: { label: "Deed Transfer", icon: "home", color: "#2563eb", tier: 1, baseWeight: 0.9, description: "Property ownership transfer recorded at county clerk" },
  sec_form4: { label: "SEC Form 4", icon: "trending-up", color: "#7c3aed", tier: 1, baseWeight: 0.95, description: "Insider stock transaction filed with SEC" },
  sec_form_d: { label: "SEC Form D", icon: "file-text", color: "#7c3aed", tier: 1, baseWeight: 0.85, description: "Private placement securities filing" },
  sec_13f: { label: "SEC 13F", icon: "bar-chart", color: "#7c3aed", tier: 1, baseWeight: 0.8, description: "Institutional investment manager holdings report" },
  probate_filing: { label: "Probate Filing", icon: "file-minus", color: "#dc2626", tier: 1, baseWeight: 0.85, description: "Estate probate case opened" },
  business_dissolution: { label: "Business Dissolution", icon: "x-circle", color: "#ea580c", tier: 1, baseWeight: 0.9, description: "Business entity dissolved or withdrawn" },
  business_merger: { label: "Business Merger", icon: "git-merge", color: "#ea580c", tier: 1, baseWeight: 0.85, description: "Business entity merged" },
  homestead_change: { label: "Homestead Change", icon: "home", color: "#2563eb", tier: 1, baseWeight: 0.6, description: "Homestead exemption filed or removed" },
  property_value_change: { label: "Property Value Change", icon: "trending-up", color: "#2563eb", tier: 1, baseWeight: 0.5, description: "Significant property assessed value change" },
  divorce_filing: { label: "Divorce Filing", icon: "users", color: "#dc2626", tier: 1, baseWeight: 0.75, description: "Dissolution of marriage filed" },
  bankruptcy_emergence: { label: "Bankruptcy Emergence", icon: "refresh-cw", color: "#059669", tier: 2, baseWeight: 0.7, description: "Bankruptcy case discharged or dismissed" },
  court_settlement: { label: "Court Settlement", icon: "award", color: "#059669", tier: 2, baseWeight: 0.8, description: "Federal court settlement recorded" },
  professional_retirement: { label: "Professional Retirement", icon: "briefcase", color: "#0891b2", tier: 2, baseWeight: 0.85, description: "Licensed professional retired or surrendered license" },
  license_surrender: { label: "License Surrender", icon: "shield-off", color: "#0891b2", tier: 2, baseWeight: 0.7, description: "Professional license voluntarily surrendered" },
  pension_eligible: { label: "Pension Eligible", icon: "clock", color: "#0891b2", tier: 2, baseWeight: 0.65, description: "Government employee at pension eligibility age/years" },
  high_salary: { label: "High Salary", icon: "dollar-sign", color: "#0891b2", tier: 2, baseWeight: 0.5, description: "Public employee with high compensation" },
  tsp_contribution: { label: "TSP Contribution", icon: "piggy-bank", color: "#0891b2", tier: 2, baseWeight: 0.55, description: "High Thrift Savings Plan contribution" },
  patent_assignment: { label: "Patent Assignment", icon: "award", color: "#0891b2", tier: 2, baseWeight: 0.75, description: "Patent ownership transferred" },
  news_liquidity_event: { label: "Liquidity Event (News)", icon: "newspaper", color: "#f59e0b", tier: 3, baseWeight: 0.7, description: "AI-extracted liquidity event from news" },
  news_executive_change: { label: "Executive Change", icon: "user-check", color: "#f59e0b", tier: 3, baseWeight: 0.55, description: "C-suite departure or retirement in press" },
  news_acquisition: { label: "Acquisition (News)", icon: "shopping-cart", color: "#f59e0b", tier: 3, baseWeight: 0.75, description: "Company acquisition mentioned in press" },
  linkedin_status_change: { label: "LinkedIn Status Change", icon: "linkedin", color: "#0a66c2", tier: 3, baseWeight: 0.5, description: "Job title or company change on LinkedIn" },
  linkedin_retirement: { label: "LinkedIn Retirement", icon: "linkedin", color: "#0a66c2", tier: 3, baseWeight: 0.8, description: "Retirement announced on LinkedIn profile" },
  commercial_re_sale: { label: "Commercial RE Sale", icon: "building", color: "#f59e0b", tier: 3, baseWeight: 0.7, description: "Commercial real estate transaction closed" },
  auction_consignment: { label: "Auction Consignment", icon: "gavel", color: "#f59e0b", tier: 3, baseWeight: 0.6, description: "High-value item consigned for auction" },
  intent_surge: { label: "Intent Surge", icon: "activity", color: "#8b5cf6", tier: 4, baseWeight: 0.45, description: "B2B intent data spike for financial topics" },
  intent_research: { label: "Intent Research", icon: "search", color: "#8b5cf6", tier: 4, baseWeight: 0.4, description: "Researching financial planning software" },
  social_retirement_post: { label: "Retirement Post", icon: "message-circle", color: "#8b5cf6", tier: 4, baseWeight: 0.6, description: "Public social post announcing retirement" },
  social_life_event: { label: "Life Event Post", icon: "heart", color: "#8b5cf6", tier: 4, baseWeight: 0.35, description: "Public social life event announcement" },
};

export function getSignalWeight(type: SignalType): number {
  return SIGNAL_METADATA[type].baseWeight;
}

export function getSignalTier(type: SignalType): 1 | 2 | 3 | 4 {
  return SIGNAL_METADATA[type].tier;
}
