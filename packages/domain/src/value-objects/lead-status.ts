export const LeadStatuses = {
  NEW: "new",
  ENRICHING: "enriching",
  ENRICHED: "enriched",
  SCORING: "scoring",
  SCORED: "scored",
  DRAFTING: "drafting",
  REVIEW: "review",
  APPROVED: "approved",
  QUEUED: "queued",
  CONTACTED: "contacted",
  RESPONDED: "responded",
  MEETING_BOOKED: "meeting_booked",
  QUALIFIED: "qualified",
  PROPOSAL_SENT: "proposal_sent",
  CONVERTED: "converted",
  DISQUALIFIED: "disqualified",
  LOST: "lost",
  SUPPRESSED: "suppressed",
} as const;

export type LeadStatus = (typeof LeadStatuses)[keyof typeof LeadStatuses];

const VALID_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  new: ["enriching", "suppressed"],
  enriching: ["enriched", "suppressed"],
  enriched: ["scoring", "suppressed"],
  scoring: ["scored", "suppressed"],
  scored: ["drafting", "suppressed", "disqualified"],
  drafting: ["review", "suppressed"],
  review: ["approved", "drafting", "suppressed"],
  approved: ["queued", "suppressed"],
  queued: ["contacted", "suppressed"],
  contacted: ["responded", "meeting_booked", "disqualified", "lost", "suppressed"],
  responded: ["meeting_booked", "qualified", "disqualified", "lost", "suppressed"],
  meeting_booked: ["qualified", "disqualified", "lost", "suppressed"],
  qualified: ["proposal_sent", "disqualified", "lost", "suppressed"],
  proposal_sent: ["converted", "lost", "suppressed"],
  converted: [],
  disqualified: ["new"],
  lost: ["new"],
  suppressed: [],
};

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function getValidTransitions(status: LeadStatus): readonly LeadStatus[] {
  return VALID_TRANSITIONS[status];
}

export function isTerminal(status: LeadStatus): boolean {
  return VALID_TRANSITIONS[status].length === 0;
}

export function isActive(status: LeadStatus): boolean {
  return !isTerminal(status) && status !== "disqualified" && status !== "lost";
}

export const PIPELINE_STAGES: readonly LeadStatus[] = [
  "new",
  "enriched",
  "scored",
  "contacted",
  "responded",
  "meeting_booked",
  "qualified",
  "proposal_sent",
  "converted",
];
