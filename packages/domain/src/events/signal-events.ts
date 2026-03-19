import type { SignalType } from "../value-objects/signal-type.js";
import type { BaseEvent } from "./base-event.js";

export interface SignalDetected extends BaseEvent {
  readonly type: "SignalDetected";
  readonly payload: {
    signalId: string;
    signalType: SignalType;
    source: string;
    sourceUrl: string | null;
    sourceTier: 1 | 2 | 3 | 4;
    confidence: number;
    rawData: Record<string, unknown>;
    extractedData: {
      name: string | null;
      company: string | null;
      title: string | null;
      county: string | null;
      state: string | null;
      estimatedValueCents: string | null;
      date: string | null;
    };
    idempotencyKey: string;
    county: string | null;
    state: string | null;
  };
}

export interface SignalValidated extends BaseEvent {
  readonly type: "SignalValidated";
  readonly payload: {
    signalId: string;
    validatedBy: "ai" | "rules" | "manual";
    confidence: number;
    reason: string;
  };
}

export interface SignalDuplicated extends BaseEvent {
  readonly type: "SignalDuplicated";
  readonly payload: {
    signalId: string;
    existingSignalId: string;
    idempotencyKey: string;
  };
}

export interface SignalLinked extends BaseEvent {
  readonly type: "SignalLinked";
  readonly payload: {
    signalId: string;
    leadId: string;
    linkReason: "same_person" | "same_property" | "same_entity";
  };
}
