import type { LeadStatus } from "../value-objects/lead-status.js";

interface BaseEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export interface LeadCreated extends BaseEvent {
  readonly type: "LeadCreated";
  readonly payload: {
    leadId: string;
    signalId: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string | null;
    company: string | null;
    title: string | null;
    county: string | null;
    state: string | null;
    estimatedValueCents: string;
  };
}

export interface LeadMerged extends BaseEvent {
  readonly type: "LeadMerged";
  readonly payload: {
    survivorLeadId: string;
    mergedLeadId: string;
    mergeReason: string;
    matchScore: number;
  };
}

export interface LeadPromoted extends BaseEvent {
  readonly type: "LeadPromoted";
  readonly payload: {
    leadId: string;
    fromStatus: LeadStatus;
    toStatus: LeadStatus;
    reason: string;
  };
}

export interface LeadAssigned extends BaseEvent {
  readonly type: "LeadAssigned";
  readonly payload: {
    leadId: string;
    repId: string;
    territoryId: string | null;
    assignmentReason: string;
  };
}

export interface LeadSuppressed extends BaseEvent {
  readonly type: "LeadSuppressed";
  readonly payload: {
    leadId: string;
    reason: string;
    permanent: boolean;
    source: string;
  };
}

export interface LeadPurged extends BaseEvent {
  readonly type: "LeadPurged";
  readonly payload: {
    leadId: string;
    purgeReason: "retention_expired" | "gdpr_request" | "ccpa_request" | "manual";
    cryptoShredded: boolean;
  };
}
