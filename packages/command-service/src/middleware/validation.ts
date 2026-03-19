import { z } from "zod";

export const DetectSignalSchema = z.object({
  signalType: z.string(),
  source: z.string(),
  sourceUrl: z.string().url().nullable(),
  sourceTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  confidence: z.number().min(0).max(1),
  rawData: z.record(z.unknown()),
  extractedData: z.object({
    name: z.string().nullable(),
    company: z.string().nullable(),
    title: z.string().nullable(),
    county: z.string().nullable(),
    state: z.string().nullable(),
    estimatedValueCents: z.string().nullable(),
    date: z.string().nullable(),
  }),
  idempotencyKey: z.string(),
});

export const CreateLeadSchema = z.object({
  signalId: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  fullName: z.string().nullable(),
  company: z.string().nullable(),
  title: z.string().nullable(),
  county: z.string().nullable(),
  state: z.string().nullable(),
  estimatedValueCents: z.string(),
});

export const MergeLeadsSchema = z.object({
  survivorLeadId: z.string().uuid(),
  mergedLeadId: z.string().uuid(),
  mergeReason: z.string(),
  matchScore: z.number().min(0).max(1),
});

export const AssignLeadSchema = z.object({
  leadId: z.string().uuid(),
  repId: z.string().uuid(),
  territoryId: z.string().uuid().nullable(),
  reason: z.string(),
});

export const SuppressLeadSchema = z.object({
  leadId: z.string().uuid(),
  reason: z.string(),
  permanent: z.boolean(),
  source: z.string(),
});

export const ScoreLeadSchema = z.object({
  leadId: z.string().uuid(),
  scoringMethod: z.enum(["rule_based", "ml_ensemble"]),
});

export const GenerateDraftSchema = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["email", "linkedin", "voicemail", "handwritten", "sms"]),
  variant: z.string(),
});

export const RecordDispositionSchema = z.object({
  leadId: z.string().uuid(),
  dispositionType: z.enum(["meeting_booked", "qualified", "proposal_sent", "converted", "disqualified", "lost"]),
  repId: z.string().uuid(),
  notes: z.string().nullable(),
  aumCents: z.string().nullable(),
  reason: z.string().nullable(),
});

export const ExportDataSchema = z.object({
  leadId: z.string().uuid(),
  requestType: z.enum(["ccpa", "gdpr"]),
  requestedBy: z.string(),
});

export const PurgeDataSchema = z.object({
  leadId: z.string().uuid(),
  purgeReason: z.enum(["retention_expired", "gdpr_request", "ccpa_request", "manual"]),
});
