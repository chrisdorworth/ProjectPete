export const OutreachChannels = {
  EMAIL: "email",
  LINKEDIN: "linkedin",
  VOICEMAIL: "voicemail",
  HANDWRITTEN: "handwritten",
  SMS: "sms",
} as const;

export type OutreachChannel = (typeof OutreachChannels)[keyof typeof OutreachChannels];

export interface ChannelConstraints {
  maxLength: number;
  requiresConsent: boolean;
  complianceRules: string[];
  cooldownDays: number;
  costCentsPerUnit: number;
}

export const CHANNEL_CONSTRAINTS: Record<OutreachChannel, ChannelConstraints> = {
  email: {
    maxLength: 150,
    requiresConsent: false,
    complianceRules: ["CAN-SPAM", "FINRA-2210"],
    cooldownDays: 14,
    costCentsPerUnit: 1,
  },
  linkedin: {
    maxLength: 300,
    requiresConsent: false,
    complianceRules: ["FINRA-2210"],
    cooldownDays: 30,
    costCentsPerUnit: 0,
  },
  voicemail: {
    maxLength: 200,
    requiresConsent: false,
    complianceRules: ["TCPA"],
    cooldownDays: 14,
    costCentsPerUnit: 25,
  },
  handwritten: {
    maxLength: 400,
    requiresConsent: false,
    complianceRules: ["FINRA-2210"],
    cooldownDays: 60,
    costCentsPerUnit: 350,
  },
  sms: {
    maxLength: 160,
    requiresConsent: true,
    complianceRules: ["TCPA", "10DLC"],
    cooldownDays: 14,
    costCentsPerUnit: 2,
  },
};

export function getChannelConstraints(channel: OutreachChannel): ChannelConstraints {
  return CHANNEL_CONSTRAINTS[channel];
}

export function requiresConsent(channel: OutreachChannel): boolean {
  return CHANNEL_CONSTRAINTS[channel].requiresConsent;
}

export const CHANNEL_PRIORITY_ORDER: readonly OutreachChannel[] = [
  "email",
  "linkedin",
  "voicemail",
  "handwritten",
  "sms",
];
