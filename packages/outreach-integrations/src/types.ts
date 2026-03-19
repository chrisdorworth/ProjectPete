export interface SendResult {
  success: boolean;
  externalId: string | null;
  error: string | null;
  costCents?: number;
}

export interface DeliveryStatus {
  status: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed" | "unknown";
  details?: string;
  timestamp?: Date;
}

export interface OutreachProvider {
  name: string;
  channel: string;
  send(params: {
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    recipientLinkedinUrl?: string | null;
    recipientAddress?: { name: string; street: string; city: string; state: string; zip: string } | null;
    subject?: string;
    body: string;
    fromName: string;
    fromEmail?: string;
    metadata: Record<string, string>;
  }): Promise<SendResult>;
  checkStatus?(externalId: string): Promise<DeliveryStatus>;
}
