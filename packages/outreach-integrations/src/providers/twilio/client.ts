import type { OutreachProvider, SendResult, DeliveryStatus } from "../../types.js";

export class TwilioSmsProvider implements OutreachProvider {
  name = "twilio";
  channel = "sms";

  private accountSid: string;
  private authToken: string;
  private fromNumber: string;

  constructor(accountSid?: string, authToken?: string, fromNumber?: string) {
    this.accountSid = accountSid ?? process.env["TWILIO_ACCOUNT_SID"] ?? "";
    this.authToken = authToken ?? process.env["TWILIO_AUTH_TOKEN"] ?? "";
    this.fromNumber = fromNumber ?? process.env["TWILIO_FROM_NUMBER"] ?? "";
  }

  async send(params: {
    recipientPhone?: string | null;
    body: string;
    metadata: Record<string, string>;
  }): Promise<SendResult> {
    if (!params.recipientPhone) {
      return { success: false, externalId: null, error: "No recipient phone number" };
    }

    // TCPA compliance: body must include opt-out
    const body = params.body.includes("STOP") ? params.body : `${params.body}\nReply STOP to opt out`;

    if (body.length > 1600) {
      return { success: false, externalId: null, error: "SMS body exceeds 1600 character limit" };
    }

    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const formData = new URLSearchParams({
      To: params.recipientPhone.replace(/\D/g, "").replace(/^(\d{10})$/, "+1$1"),
      From: this.fromNumber,
      Body: body,
      StatusCallback: process.env["TWILIO_STATUS_CALLBACK_URL"] ?? "",
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const err = await response.text();
      return { success: false, externalId: null, error: `Twilio error: ${response.status} ${err}` };
    }

    const data = await response.json() as { sid: string; price: string | null };
    const costCents = data.price ? Math.abs(Math.round(parseFloat(data.price) * 100)) : 1;
    return { success: true, externalId: data.sid, error: null, costCents };
  }

  async checkStatus(externalId: string): Promise<DeliveryStatus> {
    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages/${externalId}.json`,
      { headers: { "Authorization": `Basic ${credentials}` } },
    );

    if (!response.ok) return { status: "unknown" };

    const data = await response.json() as { status: string };
    const statusMap: Record<string, DeliveryStatus["status"]> = {
      queued: "sent",
      sending: "sent",
      sent: "sent",
      delivered: "delivered",
      undelivered: "bounced",
      failed: "failed",
    };

    return { status: statusMap[data.status] ?? "unknown" };
  }
}
