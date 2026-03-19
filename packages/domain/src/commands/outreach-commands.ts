import type { OutreachChannel } from "../value-objects/outreach-channel.js";

export interface GenerateDraft {
  readonly type: "GenerateDraft";
  readonly leadId: string;
  readonly channel: OutreachChannel;
  readonly variant: string;
}

export interface QueueOutreach {
  readonly type: "QueueOutreach";
  readonly outreachId: string;
  readonly leadId: string;
  readonly channel: OutreachChannel;
  readonly scheduledFor: string | null;
}

export interface SendOutreach {
  readonly type: "SendOutreach";
  readonly outreachId: string;
  readonly leadId: string;
  readonly channel: OutreachChannel;
}

export interface RecordDisposition {
  readonly type: "RecordDisposition";
  readonly leadId: string;
  readonly dispositionType: "meeting_booked" | "qualified" | "proposal_sent" | "converted" | "disqualified" | "lost";
  readonly repId: string;
  readonly notes: string | null;
  readonly aumCents: string | null;
  readonly reason: string | null;
}
