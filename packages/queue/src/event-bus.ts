import type { Queue } from "bullmq";
import type { StoredEvent } from "@meridian/event-store";
import type { QueueName } from "./queues.js";
import { QUEUE_NAMES } from "./queues.js";

type EventRouting = Record<string, QueueName[]>;

const EVENT_ROUTING: EventRouting = {
  SignalDetected: [QUEUE_NAMES.GRAPH_SYNC],
  SignalValidated: [QUEUE_NAMES.ENRICH],

  LeadCreated: [QUEUE_NAMES.ENRICH, QUEUE_NAMES.GRAPH_SYNC],

  EnrichmentMerged: [QUEUE_NAMES.HOUSEHOLD, QUEUE_NAMES.SCORE, QUEUE_NAMES.GRAPH_SYNC],

  HouseholdFormed: [QUEUE_NAMES.GRAPH_SYNC, QUEUE_NAMES.SCORE],
  HouseholdMemberAdded: [QUEUE_NAMES.GRAPH_SYNC],
  HouseholdValueUpdated: [QUEUE_NAMES.SCORE],

  LeadScored: [QUEUE_NAMES.DRAFT],

  DraftGenerated: [QUEUE_NAMES.COMPLIANCE],

  ComplianceReviewed: [QUEUE_NAMES.OUTREACH],

  OutreachSent: [QUEUE_NAMES.TRACKING],
  OutreachBounced: [QUEUE_NAMES.TRACKING],
  OutreachReplied: [QUEUE_NAMES.TRACKING],

  MeetingBooked: [QUEUE_NAMES.MEETING_PREP],

  LeadConverted: [QUEUE_NAMES.FEEDBACK],
  LeadDisqualified: [QUEUE_NAMES.FEEDBACK],
  LeadLost: [QUEUE_NAMES.FEEDBACK],
};

export class EventBus {
  constructor(private readonly queues: Map<QueueName, Queue>) {}

  async dispatch(event: StoredEvent): Promise<void> {
    const targetQueues = EVENT_ROUTING[event.eventType];
    if (!targetQueues) return;

    const promises = targetQueues.map((queueName) => {
      const queue = this.queues.get(queueName);
      if (!queue) return Promise.resolve();

      return queue.add(event.eventType, {
        eventId: event.id,
        aggregateId: event.aggregateId,
        eventType: event.eventType,
        payload: event.payload,
        metadata: event.metadata,
        createdAt: event.createdAt.toISOString(),
      }, {
        jobId: `${event.id}-${queueName}`,
      });
    });

    await Promise.all(promises);
  }

  async dispatchBatch(events: StoredEvent[]): Promise<void> {
    for (const event of events) {
      await this.dispatch(event);
    }
  }
}
