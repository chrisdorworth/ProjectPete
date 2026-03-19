import type { SignalType } from "../value-objects/signal-type.js";

export interface DetectSignal {
  readonly type: "DetectSignal";
  readonly signalType: SignalType;
  readonly source: string;
  readonly sourceUrl: string | null;
  readonly sourceTier: 1 | 2 | 3 | 4;
  readonly confidence: number;
  readonly rawData: Record<string, unknown>;
  readonly extractedData: {
    name: string | null;
    company: string | null;
    title: string | null;
    county: string | null;
    state: string | null;
    estimatedValueCents: string | null;
    date: string | null;
  };
  readonly idempotencyKey: string;
}

export interface ValidateSignal {
  readonly type: "ValidateSignal";
  readonly signalId: string;
  readonly validatedBy: "ai" | "rules" | "manual";
  readonly confidence: number;
  readonly reason: string;
}

export interface RejectSignal {
  readonly type: "RejectSignal";
  readonly signalId: string;
  readonly reason: string;
}
