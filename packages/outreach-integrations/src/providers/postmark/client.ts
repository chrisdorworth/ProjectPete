import type { OutreachProvider, SendResult, DeliveryStatus } from "../../types.js";

export class PostmarkProvider implements OutreachProvider {
  name = "postmark";
  channel = "email";

  private serverToken: string;
  private baseUrl = "https://api.postmarkapp.com";

  /** Physical mailing address required by CAN-SPAM. */
  private physicalAddress: string;
  /** Base URL for unsubscribe links. */
  private unsubscribeBaseUrl: string;

  constructor(serverToken?: string) {
    this.serverToken = serverToken ?? process.env["POSTMARK_SERVER_TOKEN"] ?? "";
    this.physicalAddress =
      process.env["CAN_SPAM_PHYSICAL_ADDRESS"] ??
      "Project Meridian, 123 Main St, Suite 100, New York, NY 10001";
    this.unsubscribeBaseUrl =
      process.env["UNSUBSCRIBE_BASE_URL"] ?? "https://meridian.app/unsubscribe";
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

    // Build CAN-SPAM compliant unsubscribe link (unique per recipient)
    const unsubscribeToken = params.metadata["outreachId"] ?? params.metadata["leadId"] ?? "";
    const unsubscribeLink = `${this.unsubscribeBaseUrl}?token=${encodeURIComponent(unsubscribeToken)}&email=${encodeURIComponent(params.recipientEmail)}`;

    // Append CAN-SPAM required footer (physical address + unsubscribe link)
    const canSpamFooter = `
<hr style="margin-top:32px;border:none;border-top:1px solid #ccc;" />
<p style="font-size:12px;color:#666;text-align:center;">
  You are receiving this email because of your relationship with ${params.fromName}.<br/>
  ${this.physicalAddress}<br/>
  <a href="${unsubscribeLink}" style="color:#666;">Unsubscribe</a> from future emails.
</p>`;

    const htmlBodyWithFooter = params.body + canSpamFooter;
    const textFooter = `\n\n---\n${this.physicalAddress}\nUnsubscribe: ${unsubscribeLink}`;
    const textBodyWithFooter = params.body.replace(/<[^>]*>/g, "") + textFooter;

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
        HtmlBody: htmlBodyWithFooter,
        TextBody: textBodyWithFooter,
        MessageStream: "outbound",
        TrackOpens: true,
        TrackLinks: "HtmlAndText",
        Metadata: params.metadata,
        Headers: [
          { Name: "List-Unsubscribe", Value: `<${unsubscribeLink}>` },
          { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
        ],
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
