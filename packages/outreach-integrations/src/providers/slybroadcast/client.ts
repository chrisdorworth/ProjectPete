import type { OutreachProvider, SendResult, DeliveryStatus } from "../../types.js";

export class SlybroadcastProvider implements OutreachProvider {
  name = "slybroadcast";
  channel = "voicemail";

  private uid: string;
  private password: string;
  private baseUrl = "https://api.slybroadcast.com";

  constructor(uid?: string, password?: string) {
    this.uid = uid ?? process.env["SLYBROADCAST_UID"] ?? "";
    this.password = password ?? process.env["SLYBROADCAST_PASSWORD"] ?? "";
  }

  async send(params: {
    recipientPhone?: string | null;
    body: string;
    fromName: string;
    metadata: Record<string, string>;
  }): Promise<SendResult> {
    if (!params.recipientPhone) {
      return { success: false, externalId: null, error: "No recipient phone number" };
    }

    const callerIdNumber = process.env["SLYBROADCAST_CALLER_ID"] ?? "";

    const formData = new URLSearchParams({
      c_uid: this.uid,
      c_password: this.password,
      c_phone: params.recipientPhone.replace(/\D/g, ""),
      c_callerID: callerIdNumber,
      c_url: "", // Audio URL - would be set after TTS conversion
      c_date: "now",
      c_audio: "mp3",
      c_record_audio: params.body, // Text-to-speech content
    });

    const response = await fetch(`${this.baseUrl}/vmb.php`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return { success: false, externalId: null, error: `Slybroadcast error: ${response.status}` };
    }

    const text = await response.text();
    // Slybroadcast returns OK with campaign ID or ERROR
    if (text.startsWith("OK")) {
      const campaignId = text.split(" ")[1] ?? text;
      return { success: true, externalId: campaignId, error: null, costCents: 4 };
    }

    return { success: false, externalId: null, error: `Slybroadcast: ${text}` };
  }

  async checkStatus(externalId: string): Promise<DeliveryStatus> {
    const formData = new URLSearchParams({
      c_uid: this.uid,
      c_password: this.password,
      c_action: "status",
      c_session_id: externalId,
    });

    const response = await fetch(`${this.baseUrl}/vmb.php`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      return { status: "unknown" };
    }

    const text = await response.text();
    if (text.includes("DELIVERED")) return { status: "delivered" };
    if (text.includes("SENT")) return { status: "sent" };
    if (text.includes("FAILED")) return { status: "failed", details: text };
    return { status: "unknown", details: text };
  }
}
