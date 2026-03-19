import type { LeadStatus } from "../value-objects/lead-status.js";
import { canTransition, isTerminal } from "../value-objects/lead-status.js";
import type { SignalType } from "../value-objects/signal-type.js";
import type { ScoreBreakdown } from "../value-objects/score.js";
import type { MeridianEvent } from "../events/index.js";

export interface LeadState {
  id: string;
  status: LeadStatus;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  company: string | null;
  title: string | null;
  county: string | null;
  state: string | null;
  estimatedValueCents: bigint;
  compositeScore: number;
  qualitativeScore: number;
  quantitativeScore: number;
  scoreBreakdown: ScoreBreakdown | null;
  signalIds: string[];
  signalTypes: SignalType[];
  enrichmentStatus: "pending" | "in_progress" | "completed" | "failed";
  enrichmentCompleteness: number;
  householdId: string | null;
  assignedRepId: string | null;
  territoryId: string | null;
  isSuppressed: boolean;
  suppressionReason: string | null;
  hasWarmPath: boolean;
  competitorDetected: boolean;
  rapportHookCount: number;
  outreachAttemptCount: number;
  lastContactAt: Date | null;
  firstSignalAt: Date | null;
  lastSignalAt: Date | null;
  version: number;
  createdAt: Date;
}

export function createInitialLeadState(): LeadState {
  return {
    id: "",
    status: "new",
    firstName: null,
    lastName: null,
    fullName: null,
    company: null,
    title: null,
    county: null,
    state: null,
    estimatedValueCents: 0n,
    compositeScore: 0,
    qualitativeScore: 0,
    quantitativeScore: 0,
    scoreBreakdown: null,
    signalIds: [],
    signalTypes: [],
    enrichmentStatus: "pending",
    enrichmentCompleteness: 0,
    householdId: null,
    assignedRepId: null,
    territoryId: null,
    isSuppressed: false,
    suppressionReason: null,
    hasWarmPath: false,
    competitorDetected: false,
    rapportHookCount: 0,
    outreachAttemptCount: 0,
    lastContactAt: null,
    firstSignalAt: null,
    lastSignalAt: null,
    version: 0,
    createdAt: new Date(),
  };
}

export function applyEvent(state: LeadState, event: MeridianEvent): LeadState {
  switch (event.type) {
    case "LeadCreated":
      return {
        ...state,
        id: event.payload.leadId,
        firstName: event.payload.firstName,
        lastName: event.payload.lastName,
        fullName: event.payload.fullName,
        company: event.payload.company,
        title: event.payload.title,
        county: event.payload.county,
        state: event.payload.state,
        estimatedValueCents: BigInt(event.payload.estimatedValueCents),
        signalIds: [event.payload.signalId],
        firstSignalAt: event.timestamp,
        lastSignalAt: event.timestamp,
        version: event.version,
        createdAt: event.timestamp,
      };

    case "SignalLinked":
      return {
        ...state,
        signalIds: [...state.signalIds, event.payload.signalId],
        lastSignalAt: event.timestamp,
        version: event.version,
      };

    case "LeadPromoted": {
      if (!canTransition(state.status, event.payload.toStatus)) {
        return state;
      }
      return {
        ...state,
        status: event.payload.toStatus,
        version: event.version,
      };
    }

    case "LeadMerged":
      return {
        ...state,
        signalIds: [...state.signalIds, ...event.payload.mergedSignalIds],
        enrichmentCompleteness: Math.max(state.enrichmentCompleteness, event.payload.mergedEnrichmentCompleteness ?? 0),
        version: event.version,
      };

    case "LeadAssigned":
      return {
        ...state,
        assignedRepId: event.payload.repId,
        territoryId: event.payload.territoryId,
        version: event.version,
      };

    case "LeadSuppressed":
      return {
        ...state,
        status: "suppressed",
        isSuppressed: true,
        suppressionReason: event.payload.reason,
        version: event.version,
      };

    case "EnrichmentRequested":
      return {
        ...state,
        enrichmentStatus: "in_progress",
        version: event.version,
      };

    case "EnrichmentMerged":
      return {
        ...state,
        enrichmentStatus: "completed",
        enrichmentCompleteness: event.payload.completeness,
        version: event.version,
      };

    case "EnrichmentFailed":
      return {
        ...state,
        enrichmentStatus: state.enrichmentCompleteness > 0 ? "completed" : "failed",
        version: event.version,
      };

    case "LeadScored":
      return {
        ...state,
        compositeScore: event.payload.compositeScore,
        qualitativeScore: event.payload.qualitativeScore,
        quantitativeScore: event.payload.quantitativeScore,
        scoreBreakdown: event.payload.breakdown,
        version: event.version,
      };

    case "LeadRescored":
      return {
        ...state,
        compositeScore: event.payload.newScore,
        scoreBreakdown: event.payload.breakdown,
        version: event.version,
      };

    case "ScoreOverridden":
      return {
        ...state,
        compositeScore: event.payload.newScore,
        version: event.version,
      };

    case "RapportExtracted":
      return {
        ...state,
        rapportHookCount: event.payload.hookCount,
        version: event.version,
      };

    case "WarmPathFound":
      return {
        ...state,
        hasWarmPath: event.payload.paths.length > 0,
        version: event.version,
      };

    case "CompetitorDetected":
      return {
        ...state,
        competitorDetected: true,
        version: event.version,
      };

    case "HouseholdFormed":
      return {
        ...state,
        householdId: event.payload.householdId,
        version: event.version,
      };

    case "HouseholdMemberAdded":
      if (event.payload.leadId === state.id) {
        return {
          ...state,
          householdId: event.payload.householdId,
          version: event.version,
        };
      }
      return state;

    case "OutreachSent":
      return {
        ...state,
        outreachAttemptCount: state.outreachAttemptCount + 1,
        lastContactAt: event.timestamp,
        version: event.version,
      };

    case "MeetingBooked":
      return {
        ...state,
        status: canTransition(state.status, "meeting_booked") ? "meeting_booked" : state.status,
        version: event.version,
      };

    case "LeadQualified":
      return {
        ...state,
        status: canTransition(state.status, "qualified") ? "qualified" : state.status,
        version: event.version,
      };

    case "LeadConverted":
      return {
        ...state,
        status: canTransition(state.status, "converted") ? "converted" : state.status,
        version: event.version,
      };

    case "LeadDisqualified":
      return {
        ...state,
        status: canTransition(state.status, "disqualified") ? "disqualified" : state.status,
        version: event.version,
      };

    case "LeadLost":
      return {
        ...state,
        status: canTransition(state.status, "lost") ? "lost" : state.status,
        version: event.version,
      };

    default:
      return state;
  }
}

export function hydrateLeadFromEvents(events: MeridianEvent[]): LeadState {
  return events.reduce(applyEvent, createInitialLeadState());
}

export function validateLeadCommand(
  state: LeadState,
  commandType: string,
): { valid: boolean; reason?: string } {
  if (isTerminal(state.status) && commandType !== "PurgeData") {
    return { valid: false, reason: `Lead is in terminal status: ${state.status}` };
  }
  if (state.isSuppressed && !["PurgeData", "ExportData"].includes(commandType)) {
    return { valid: false, reason: "Lead is suppressed" };
  }
  return { valid: true };
}
