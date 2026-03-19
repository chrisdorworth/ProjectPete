import type { OutreachProvider, SendResult, DeliveryStatus } from "../../types.js";

export class PostmarkProvider implements OutreachProvider {
  name = "postmark";
  channel = "email";

  private serverToken: string;
  private baseUrl = "https://api.postmarkapp.com";

  constructor(serverToken?: string) {
    this.serverToken = serverToken ?? process.env["POSTMARK_SERVER_TOKEN"] ?? "";
  }

  async send(params: {
    recipientEmail?: string | null;
    subject?: string;
    body: string;
    fromName: string;
    fromEmail?: string;
    metadata: Record<string, string>;
  }): Promise<SendResult> {
    if (!params.recipientEmail) {
      return { success: false, externalId: null, error: "No recipient email" };
    }

    const fromEmail = params.fromEmail ?? process.env["OUTREACH_FROM_EMAIL"] ?? "noreply@meridian.app";

    const response = await fetch(`${this.baseUrl}/email`, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": this.serverToken,
      },
      body: JSON.stringify({
        From: `${params.fromName} <${fromEmail}>`,
        To: params.recipientEmail,
        Subject: params.subject ?? "A message from your financial advisor",
        HtmlBody: params.body,
        TextBody: params.body.replace(/<[^>]*>/g, ""),
        MessageStream: "outbound",
        TrackOpens: true,
        TrackLinks: "HtmlAndText",
        Metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, externalId: null, error: `Postmark error: ${response.status} ${err}` };
    }

    const data = await response.json() as { MessageID: string };
    return { success: true, externalId: data.MessageID, error: null, costCents: 0 };
  }

  async checkStatus(externalId: string): Promise<DeliveryStatus> {
    const response = await fetch(`${this.baseUrl}/messages/outbound/${externalId}/details`, {
      headers: {
        "Accept": "application/json",
        "X-Postmark-Server-Token": this.serverToken,
      },
    });

    if (!response.ok) {
      return { status: "unknown" };
    }

    const data = await response.json() as { Status: string; Recipients: string[] };
    const statusMap: Record<string, DeliveryStatus["status"]> = {
      Sent: "sent",
      Delivered: "delivered",
      Processed: "sent",
    };

    return { status: statusMap[data.Status] ?? "unknown" };
  }
}
