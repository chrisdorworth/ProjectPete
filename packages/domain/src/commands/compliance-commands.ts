export interface ReviewCompliance {
  readonly type: "ReviewCompliance";
  readonly outreachId: string;
  readonly leadId: string;
}

export interface ApproveOutreach {
  readonly type: "ApproveOutreach";
  readonly outreachId: string;
  readonly reviewedBy: string;
}

export interface FlagOutreach {
  readonly type: "FlagOutreach";
  readonly outreachId: string;
  readonly reason: string;
  readonly flaggedBy: string;
}

export interface ExportData {
  readonly type: "ExportData";
  readonly leadId: string;
  readonly requestType: "ccpa" | "gdpr";
  readonly requestedBy: string;
}

export interface PurgeData {
  readonly type: "PurgeData";
  readonly leadId: string;
  readonly purgeReason: "retention_expired" | "gdpr_request" | "ccpa_request" | "manual";
}
