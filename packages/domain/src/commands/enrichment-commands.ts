export interface RequestEnrichment {
  readonly type: "RequestEnrichment";
  readonly leadId: string;
  readonly provider: string;
  readonly priority: "high" | "normal" | "low";
}

export interface RetryEnrichment {
  readonly type: "RetryEnrichment";
  readonly leadId: string;
  readonly provider: string;
  readonly attemptNumber: number;
}
