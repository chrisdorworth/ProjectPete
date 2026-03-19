interface BaseEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export interface MeetingBooked extends BaseEvent {
  readonly type: "MeetingBooked";
  readonly payload: {
    leadId: string;
    repId: string;
    scheduledAt: string;
    meetingType: "phone" | "video" | "in_person";
    notes: string | null;
  };
}

export interface LeadQualified extends BaseEvent {
  readonly type: "LeadQualified";
  readonly payload: {
    leadId: string;
    repId: string;
    qualificationNotes: string;
    estimatedAumCents: string;
  };
}

export interface ProposalSent extends BaseEvent {
  readonly type: "ProposalSent";
  readonly payload: {
    leadId: string;
    repId: string;
    proposalType: string;
    estimatedAumCents: string;
  };
}

export interface LeadConverted extends BaseEvent {
  readonly type: "LeadConverted";
  readonly payload: {
    leadId: string;
    repId: string;
    aumCents: string;
    accountType: string;
    notes: string | null;
  };
}

export interface LeadDisqualified extends BaseEvent {
  readonly type: "LeadDisqualified";
  readonly payload: {
    leadId: string;
    repId: string | null;
    reason: string;
    details: string | null;
  };
}

export interface LeadLost extends BaseEvent {
  readonly type: "LeadLost";
  readonly payload: {
    leadId: string;
    repId: string | null;
    reason: "competitor" | "declined" | "no_response" | "timing" | "other";
    competitorName: string | null;
    details: string | null;
  };
}
