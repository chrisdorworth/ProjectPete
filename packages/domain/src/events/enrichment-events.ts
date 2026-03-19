interface BaseEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export interface EnrichmentRequested extends BaseEvent {
  readonly type: "EnrichmentRequested";
  readonly payload: {
    leadId: string;
    provider: string;
    priority: "high" | "normal" | "low";
  };
}

export interface EnrichmentCompleted extends BaseEvent {
  readonly type: "EnrichmentCompleted";
  readonly payload: {
    leadId: string;
    provider: string;
    fieldsPopulated: string[];
    confidence: number;
    costCents: number;
    durationMs: number;
  };
}

export interface EnrichmentFailed extends BaseEvent {
  readonly type: "EnrichmentFailed";
  readonly payload: {
    leadId: string;
    provider: string;
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
  };
}

export interface EnrichmentMerged extends BaseEvent {
  readonly type: "EnrichmentMerged";
  readonly payload: {
    leadId: string;
    providersUsed: string[];
    fieldsPopulated: string[];
    totalConfidence: number;
    completeness: number;
    totalCostCents: number;
  };
}
