import type { ScoreBreakdown } from "../value-objects/score.js";

interface BaseEvent {
  readonly id: string;
  readonly aggregateId: string;
  readonly version: number;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}

export interface LeadScored extends BaseEvent {
  readonly type: "LeadScored";
  readonly payload: {
    leadId: string;
    compositeScore: number;
    qualitativeScore: number;
    quantitativeScore: number;
    breakdown: ScoreBreakdown;
    modelVersion: string;
    scoringMethod: "rule_based" | "ml_ensemble" | "manual";
  };
}

export interface LeadRescored extends BaseEvent {
  readonly type: "LeadRescored";
  readonly payload: {
    leadId: string;
    previousScore: number;
    newScore: number;
    trigger: "new_signal" | "enrichment_complete" | "model_update" | "manual";
    breakdown: ScoreBreakdown;
  };
}

export interface ScoreOverridden extends BaseEvent {
  readonly type: "ScoreOverridden";
  readonly payload: {
    leadId: string;
    previousScore: number;
    newScore: number;
    overriddenBy: string;
    reason: string;
  };
}
