import type { OutreachProvider, SendResult, DeliveryStatus } from "../../types.js";

export class LinkedInApiProvider implements OutreachProvider {
  name = "linkedin-api";
  channel = "linkedin";

  private accessToken: string;
  private baseUrl = "https://api.linkedin.com/v2";

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? process.env["LINKEDIN_ACCESS_TOKEN"] ?? "";
  }

  async send(params: {
    recipientLinkedinUrl?: string | null;
    body: string;
    fromName: string;
    metadata: Record<string, string>;
  }): Promise<SendResult> {
    if (!params.recipientLinkedinUrl) {
      return { success: false, externalId: null, error: "No LinkedIn profile URL" };
    }

    // Extract LinkedIn member URN from profile URL
    const memberUrn = await this.resolveMemberUrn(params.recipientLinkedinUrl);
    if (!memberUrn) {
      return { success: false, externalId: null, error: "Could not resolve LinkedIn member URN" };
    }

    // Send connection request with note (preferred first touch)
    if (params.metadata["type"] === "connection_request") {
      return this.sendConnectionRequest(memberUrn, params.body);
    }

    // Send InMail (requires Sales Navigator or premium)
    return this.sendInMail(memberUrn, params.body, params.metadata["subject"] ?? "");
  }

  private async sendConnectionRequest(memberUrn: string, message: string): Promise<SendResult> {
    const response = await fetch(`${this.baseUrl}/invitations`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        invitee: `urn:li:person:${memberUrn}`,
        message: message.slice(0, 300),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, externalId: null, error: `LinkedIn connection error: ${response.status} ${err}` };
    }

    return { success: true, externalId: `conn-${memberUrn}`, error: null, costCents: 0 };
  }

  private async sendInMail(memberUrn: string, body: string, subject: string): Promise<SendResult> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        recipients: [`urn:li:person:${memberUrn}`],
        subject,
        body,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, externalId: null, error: `LinkedIn InMail error: ${response.status} ${err}` };
    }

    const data = await response.json() as { id: string };
    return { success: true, externalId: data.id, error: null, costCents: 0 };
  }

  private async resolveMemberUrn(profileUrl: string): Promise<string | null> {
    // Extract vanity name from URL
    const match = profileUrl.match(/linkedin\.com\/in\/([^/?]+)/);
    if (!match) return null;
    return match[1] ?? null;
  }

  async checkStatus(externalId: string): Promise<DeliveryStatus> {
    // LinkedIn doesn't expose granular delivery status via API
    return { status: "sent" };
  }
}
