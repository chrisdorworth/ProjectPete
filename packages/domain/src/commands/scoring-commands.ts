export interface ScoreLead {
  readonly type: "ScoreLead";
  readonly leadId: string;
  readonly scoringMethod: "rule_based" | "ml_ensemble";
}

export interface RescoreLead {
  readonly type: "RescoreLead";
  readonly leadId: string;
  readonly trigger: "new_signal" | "enrichment_complete" | "model_update" | "manual";
}

export interface OverrideScore {
  readonly type: "OverrideScore";
  readonly leadId: string;
  readonly newScore: number;
  readonly overriddenBy: string;
  readonly reason: string;
}
