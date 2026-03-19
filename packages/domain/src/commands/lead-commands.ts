export interface CreateLead {
  readonly type: "CreateLead";
  readonly signalId: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly fullName: string | null;
  readonly company: string | null;
  readonly title: string | null;
  readonly county: string | null;
  readonly state: string | null;
  readonly estimatedValueCents: string;
}

export interface MergeLeads {
  readonly type: "MergeLeads";
  readonly survivorLeadId: string;
  readonly mergedLeadId: string;
  readonly mergeReason: string;
  readonly matchScore: number;
}

export interface AssignLead {
  readonly type: "AssignLead";
  readonly leadId: string;
  readonly repId: string;
  readonly territoryId: string | null;
  readonly reason: string;
}

export interface SuppressLead {
  readonly type: "SuppressLead";
  readonly leadId: string;
  readonly reason: string;
  readonly permanent: boolean;
  readonly source: string;
}
