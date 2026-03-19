import { createHmac, timingSafeEqual } from "node:crypto";
import type { EventStore } from "@meridian/event-store";

interface WebhookEvent {
  provider: string;
  type: string;
  externalId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export class WebhookHandler {
  private postmarkWebhookSecret: string;
  private twilioAuthToken: string;

  constructor(private eventStore: EventStore) {
    this.postmarkWebhookSecret = process.env["POSTMARK_WEBHOOK_SECRET"] ?? "";
    this.twilioAuthToken = process.env["TWILIO_AUTH_TOKEN"] ?? "";
  }

  /**
   * Verifies an HMAC-SHA256 webhook signature.
   * Returns true when the computed HMAC matches the provided signature.
   */
  private verifySignature(payload: string, signature: string, secret: string): boolean {
    if (!secret || !signature) return false;
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const sigBuf = Buffer.from(signature, "hex");
    const expectedBuf = Buffer.from(expected, "hex");
    if (sigBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(sigBuf, expectedBuf);
  }

  async handlePostmarkWebhook(
    payload: Record<string, unknown>,
    rawBody?: string,
    signature?: string,
  ): Promise<void> {
    // --- Verify webhook signature before processing ---
    const body = rawBody ?? JSON.stringify(payload);
    const sig = signature ?? (payload["_signature"] as string | undefined) ?? "";
    if (!this.verifySignature(body, sig, this.postmarkWebhookSecret)) {
      throw new Error("Invalid Postmark webhook signature – request rejected");
    }
    const messageId = payload["MessageID"] as string;
    const recordType = payload["RecordType"] as string;

    const eventTypeMap: Record<string, string> = {
      Delivery: "OutreachDelivered",
      Open: "OutreachOpened",
      Click: "OutreachClicked",
      Bounce: "OutreachBounced",
    };

    const eventType = eventTypeMap[recordType];
    if (!eventType || !messageId) return;

    await this.emitTrackingEvent({
      provider: "postmark",
      type: eventType,
      externalId: messageId,
      timestamp: new Date(payload["DeliveredAt"] as string ?? Date.now()),
      data: payload,
    });
  }

  async handleTwilioWebhook(
    payload: Record<string, unknown>,
    rawBody?: string,
    signature?: string,
  ): Promise<void> {
    // --- Verify webhook signature before processing ---
    const body = rawBody ?? JSON.stringify(payload);
    const sig = signature ?? (payload["_signature"] as string | undefined) ?? "";
    if (!this.verifySignature(body, sig, this.twilioAuthToken)) {
      throw new Error("Invalid Twilio webhook signature – request rejected");
    }

    const messageSid = payload["MessageSid"] as string;
    const status = payload["MessageStatus"] as string;

    const eventTypeMap: Record<string, string> = {
      delivered: "OutreachDelivered",
      undelivered: "OutreachBounced",
      failed: "OutreachBounced",
    };

    const eventType = eventTypeMap[status];
    if (!eventType || !messageSid) return;

    await this.emitTrackingEvent({
      provider: "twilio",
      type: eventType,
      externalId: messageSid,
      timestamp: new Date(),
      data: payload,
    });
  }

  private async emitTrackingEvent(event: WebhookEvent): Promise<void> {
    // Look up the lead/outreach by externalId and emit appropriate domain event
    // This will be handled by the tracking worker
    await this.eventStore.append({
      streamId: `outreach-tracking-${event.externalId}`,
      type: event.type,
      data: {
        provider: event.provider,
        externalId: event.externalId,
        timestamp: event.timestamp.toISOString(),
        rawData: event.data,
      },
      metadata: { source: "webhook", provider: event.provider },
    });
  }
}
