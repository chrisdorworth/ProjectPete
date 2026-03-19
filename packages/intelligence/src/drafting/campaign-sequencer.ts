import { createDefaultCampaign, type CampaignState } from "@meridian/domain";
import { determineChannelPriority, selectBestVariant, type OutreachContext } from "@meridian/domain";

export interface SequenceResult {
  campaign: CampaignState;
  firstChannel: string;
  firstVariant: string;
  totalSteps: number;
  estimatedDuration: number;
}

export function createSequence(
  leadId: string,
  signalType: string,
  context: OutreachContext,
): SequenceResult {
  const campaign = createDefaultCampaign(leadId, signalType);
  const channels = determineChannelPriority(context);
  const firstChannel = channels[0] ?? "email";
  const firstVariant = selectBestVariant(firstChannel, context);

  const estimatedDuration = campaign.steps.reduce(
    (max, step) => Math.max(max, step.delayDays),
    0,
  );

  return {
    campaign,
    firstChannel,
    firstVariant,
    totalSteps: campaign.steps.length,
    estimatedDuration,
  };
}
