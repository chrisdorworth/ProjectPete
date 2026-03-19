export type {
  SignalDetected,
  SignalValidated,
  SignalDuplicated,
  SignalLinked,
} from "./signal-events.js";

export type {
  LeadCreated,
  LeadMerged,
  LeadPromoted,
  LeadAssigned,
  LeadSuppressed,
  LeadPurged,
} from "./lead-events.js";

export type {
  EnrichmentRequested,
  EnrichmentCompleted,
  EnrichmentFailed,
  EnrichmentMerged,
} from "./enrichment-events.js";

export type {
  HouseholdFormed,
  HouseholdMemberAdded,
  HouseholdValueUpdated,
} from "./household-events.js";

export type {
  LeadScored,
  LeadRescored,
  ScoreOverridden,
} from "./scoring-events.js";

export type {
  RapportExtracted,
  WarmPathFound,
  IntentDetected,
  CompetitorDetected,
  MeetingBriefGenerated,
} from "./intelligence-events.js";

export type {
  DraftGenerated,
  ComplianceReviewed,
  OutreachQueued,
  OutreachSent,
  OutreachDelivered,
  OutreachOpened,
  OutreachClicked,
  OutreachReplied,
  OutreachBounced,
  OutreachUnsubscribed,
} from "./outreach-events.js";

export type {
  MeetingBooked,
  LeadQualified,
  ProposalSent,
  LeadConverted,
  LeadDisqualified,
  LeadLost,
} from "./disposition-events.js";

export type {
  SuppressionAdded,
  SuppressionRemoved,
  DataExportRequested,
  DataExportCompleted,
  RetentionFlagged,
  RetentionPurged,
  FeedbackRecorded,
  ModelRetrained,
  ModelDeployed,
  ModelRolledBack,
  ExperimentStarted,
  ExperimentConcluded,
} from "./compliance-events.js";

import type { SignalDetected, SignalValidated, SignalDuplicated, SignalLinked } from "./signal-events.js";
import type { LeadCreated, LeadMerged, LeadPromoted, LeadAssigned, LeadSuppressed, LeadPurged } from "./lead-events.js";
import type { EnrichmentRequested, EnrichmentCompleted, EnrichmentFailed, EnrichmentMerged } from "./enrichment-events.js";
import type { HouseholdFormed, HouseholdMemberAdded, HouseholdValueUpdated } from "./household-events.js";
import type { LeadScored, LeadRescored, ScoreOverridden } from "./scoring-events.js";
import type { RapportExtracted, WarmPathFound, IntentDetected, CompetitorDetected, MeetingBriefGenerated } from "./intelligence-events.js";
import type { DraftGenerated, ComplianceReviewed, OutreachQueued, OutreachSent, OutreachDelivered, OutreachOpened, OutreachClicked, OutreachReplied, OutreachBounced, OutreachUnsubscribed } from "./outreach-events.js";
import type { MeetingBooked, LeadQualified, ProposalSent, LeadConverted, LeadDisqualified, LeadLost } from "./disposition-events.js";
import type { SuppressionAdded, SuppressionRemoved, DataExportRequested, DataExportCompleted, RetentionFlagged, RetentionPurged, FeedbackRecorded, ModelRetrained, ModelDeployed, ModelRolledBack, ExperimentStarted, ExperimentConcluded } from "./compliance-events.js";

export type MeridianEvent =
  | SignalDetected
  | SignalValidated
  | SignalDuplicated
  | SignalLinked
  | LeadCreated
  | LeadMerged
  | LeadPromoted
  | LeadAssigned
  | LeadSuppressed
  | LeadPurged
  | EnrichmentRequested
  | EnrichmentCompleted
  | EnrichmentFailed
  | EnrichmentMerged
  | HouseholdFormed
  | HouseholdMemberAdded
  | HouseholdValueUpdated
  | LeadScored
  | LeadRescored
  | ScoreOverridden
  | RapportExtracted
  | WarmPathFound
  | IntentDetected
  | CompetitorDetected
  | MeetingBriefGenerated
  | DraftGenerated
  | ComplianceReviewed
  | OutreachQueued
  | OutreachSent
  | OutreachDelivered
  | OutreachOpened
  | OutreachClicked
  | OutreachReplied
  | OutreachBounced
  | OutreachUnsubscribed
  | MeetingBooked
  | LeadQualified
  | ProposalSent
  | LeadConverted
  | LeadDisqualified
  | LeadLost
  | SuppressionAdded
  | SuppressionRemoved
  | DataExportRequested
  | DataExportCompleted
  | RetentionFlagged
  | RetentionPurged
  | FeedbackRecorded
  | ModelRetrained
  | ModelDeployed
  | ModelRolledBack
  | ExperimentStarted
  | ExperimentConcluded;

export type MeridianEventType = MeridianEvent["type"];

export const EVENT_TYPES: readonly MeridianEventType[] = [
  "SignalDetected", "SignalValidated", "SignalDuplicated", "SignalLinked",
  "LeadCreated", "LeadMerged", "LeadPromoted", "LeadAssigned", "LeadSuppressed", "LeadPurged",
  "EnrichmentRequested", "EnrichmentCompleted", "EnrichmentFailed", "EnrichmentMerged",
  "HouseholdFormed", "HouseholdMemberAdded", "HouseholdValueUpdated",
  "LeadScored", "LeadRescored", "ScoreOverridden",
  "RapportExtracted", "WarmPathFound", "IntentDetected", "CompetitorDetected", "MeetingBriefGenerated",
  "DraftGenerated", "ComplianceReviewed", "OutreachQueued", "OutreachSent", "OutreachDelivered",
  "OutreachOpened", "OutreachClicked", "OutreachReplied", "OutreachBounced", "OutreachUnsubscribed",
  "MeetingBooked", "LeadQualified", "ProposalSent", "LeadConverted", "LeadDisqualified", "LeadLost",
  "SuppressionAdded", "SuppressionRemoved", "DataExportRequested", "DataExportCompleted",
  "RetentionFlagged", "RetentionPurged",
  "FeedbackRecorded", "ModelRetrained", "ModelDeployed", "ModelRolledBack",
  "ExperimentStarted", "ExperimentConcluded",
] as const;
