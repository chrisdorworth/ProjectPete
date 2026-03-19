import type { BaseEvent } from "./base-event.js";

export interface RapportExtracted extends BaseEvent {
  readonly type: "RapportExtracted";
  readonly payload: {
    leadId: string;
    hooks: Array<{
      type: string;
      value: string;
      source: string;
      confidence: number;
    }>;
    hookCount: number;
  };
}

export interface WarmPathFound extends BaseEvent {
  readonly type: "WarmPathFound";
  readonly payload: {
    leadId: string;
    paths: Array<{
      clientId: string;
      clientName: string;
      relationship: string;
      proximity: number;
      mutual: string | null;
    }>;
  };
}

export interface IntentDetected extends BaseEvent {
  readonly type: "IntentDetected";
  readonly payload: {
    leadId: string;
    intentSource: string;
    keywords: string[];
    intentScore: number;
    matchesSignalType: boolean;
  };
}

export interface CompetitorDetected extends BaseEvent {
  readonly type: "CompetitorDetected";
  readonly payload: {
    leadId: string;
    advisorName: string | null;
    firmName: string | null;
    confidence: number;
    source: string;
  };
}

export interface MeetingBriefGenerated extends BaseEvent {
  readonly type: "MeetingBriefGenerated";
  readonly payload: {
    leadId: string;
    briefUrl: string;
    sections: string[];
    generatedBy: string;
  };
}
