import type { EventStore } from "@meridian/event-store";

interface WebhookEvent {
  provider: string;
  type: string;
  externalId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export class WebhookHandler {
  constructor(private eventStore: EventStore) {}

  async handlePostmarkWebhook(payload: Record<string, unknown>): Promise<void> {
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

  async handleTwilioWebhook(payload: Record<string, unknown>): Promise<void> {
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
