import type { OutreachChannel } from "../value-objects/outreach-channel.js";

export interface CampaignStep {
  order: number;
  channel: OutreachChannel;
  variant: string;
  delayDays: number;
  condition: "always" | "if_no_response" | "if_opened" | "if_clicked";
}

export interface CampaignState {
  id: string;
  leadId: string;
  steps: CampaignStep[];
  currentStep: number;
  status: "active" | "paused" | "completed" | "cancelled";
  startedAt: Date;
  lastStepAt: Date | null;
  version: number;
}

export function createDefaultCampaign(leadId: string, signalType: string): CampaignState {
  const steps = getStepsForSignalType(signalType);
  return {
    id: "",
    leadId,
    steps,
    currentStep: 0,
    status: "active",
    startedAt: new Date(),
    lastStepAt: null,
    version: 0,
  };
}

function getStepsForSignalType(signalType: string): CampaignStep[] {
  const highValue = [
    "deed_transfer", "sec_form4", "business_dissolution",
    "probate_filing", "court_settlement", "news_liquidity_event",
  ];

  if (highValue.includes(signalType)) {
    return [
      { order: 1, channel: "email", variant: "rapport", delayDays: 0, condition: "always" },
      { order: 2, channel: "linkedin", variant: "connection", delayDays: 2, condition: "always" },
      { order: 3, channel: "voicemail", variant: "intro", delayDays: 5, condition: "if_no_response" },
      { order: 4, channel: "email", variant: "value", delayDays: 10, condition: "if_no_response" },
      { order: 5, channel: "handwritten", variant: "note", delayDays: 14, condition: "if_no_response" },
    ];
  }

  return [
    { order: 1, channel: "email", variant: "rapport", delayDays: 0, condition: "always" },
    { order: 2, channel: "linkedin", variant: "connection", delayDays: 3, condition: "always" },
    { order: 3, channel: "email", variant: "value", delayDays: 10, condition: "if_no_response" },
    { order: 4, channel: "voicemail", variant: "intro", delayDays: 17, condition: "if_no_response" },
  ];
}

export function getNextStep(state: CampaignState): CampaignStep | null {
  if (state.status !== "active") return null;
  if (state.currentStep >= state.steps.length) return null;
  return state.steps[state.currentStep] ?? null;
}

export function advanceCampaign(state: CampaignState): CampaignState {
  const nextStep = state.currentStep + 1;
  return {
    ...state,
    currentStep: nextStep,
    status: nextStep >= state.steps.length ? "completed" : "active",
    lastStepAt: new Date(),
  };
}

export function cancelCampaign(state: CampaignState): CampaignState {
  return { ...state, status: "cancelled" };
}
