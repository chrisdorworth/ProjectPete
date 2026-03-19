// Scoring
export { EnsembleScorer } from "./scoring/ensemble-scorer.js";
export { ClaudeScorer } from "./scoring/claude-scorer.js";
export { MlScorer } from "./scoring/ml-scorer.js";
export { SignalStacker } from "./scoring/signal-stacker.js";
export { IntentCorrelator } from "./scoring/intent-correlator.js";
export { calculateRecencyDecay } from "./scoring/recency-decay.js";

// Rapport
export { HookExtractor } from "./rapport/hook-extractor.js";
export { WarmPathFinder } from "./rapport/warm-path-finder.js";
export { CompetitorDetector } from "./rapport/competitor-detector.js";
export { ALMA_MATER_DB } from "./rapport/alma-mater-db.js";
export { MILITARY_DB } from "./rapport/military-db.js";

// Drafting
export { EmailDrafter } from "./drafting/email-drafter.js";
export { LinkedInDrafter } from "./drafting/linkedin-drafter.js";
export { VoicemailDrafter } from "./drafting/voicemail-drafter.js";
export { HandwrittenDrafter } from "./drafting/handwritten-drafter.js";
export { SmsDrafter } from "./drafting/sms-drafter.js";
export { CampaignSequencer } from "./drafting/campaign-sequencer.js";

// Meeting Prep
export { BriefGenerator } from "./meeting-prep/brief-generator.js";
export type { MeetingBrief } from "./meeting-prep/brief-generator.js";
export { renderBriefToPdf } from "./meeting-prep/pdf-renderer.js";
