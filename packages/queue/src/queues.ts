import { Queue } from "bullmq";
import type { ConnectionOptions } from "bullmq";

export const QUEUE_NAMES = {
  CRAWL: "meridian:crawl",
  ENRICH: "meridian:enrich",
  HOUSEHOLD: "meridian:household",
  GRAPH_SYNC: "meridian:graph-sync",
  SCORE: "meridian:score",
  DRAFT: "meridian:draft",
  COMPLIANCE: "meridian:compliance",
  OUTREACH: "meridian:outreach",
  TRACKING: "meridian:tracking",
  DIGEST: "meridian:digest",
  MEETING_PREP: "meridian:meeting-prep",
  FEEDBACK: "meridian:feedback",
  RETENTION: "meridian:retention",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface QueueConfig {
  name: QueueName;
  defaultPriority: number;
  maxRetries: number;
  backoffType: "exponential" | "fixed";
  backoffDelay: number;
}

export const QUEUE_CONFIGS: QueueConfig[] = [
  { name: QUEUE_NAMES.CRAWL, defaultPriority: 5, maxRetries: 3, backoffType: "exponential", backoffDelay: 30000 },
  { name: QUEUE_NAMES.ENRICH, defaultPriority: 3, maxRetries: 3, backoffType: "exponential", backoffDelay: 10000 },
  { name: QUEUE_NAMES.HOUSEHOLD, defaultPriority: 4, maxRetries: 2, backoffType: "fixed", backoffDelay: 5000 },
  { name: QUEUE_NAMES.GRAPH_SYNC, defaultPriority: 6, maxRetries: 3, backoffType: "exponential", backoffDelay: 5000 },
  { name: QUEUE_NAMES.SCORE, defaultPriority: 2, maxRetries: 2, backoffType: "fixed", backoffDelay: 5000 },
  { name: QUEUE_NAMES.DRAFT, defaultPriority: 4, maxRetries: 2, backoffType: "exponential", backoffDelay: 10000 },
  { name: QUEUE_NAMES.COMPLIANCE, defaultPriority: 1, maxRetries: 1, backoffType: "fixed", backoffDelay: 5000 },
  { name: QUEUE_NAMES.OUTREACH, defaultPriority: 3, maxRetries: 3, backoffType: "exponential", backoffDelay: 30000 },
  { name: QUEUE_NAMES.TRACKING, defaultPriority: 7, maxRetries: 2, backoffType: "fixed", backoffDelay: 5000 },
  { name: QUEUE_NAMES.DIGEST, defaultPriority: 8, maxRetries: 2, backoffType: "exponential", backoffDelay: 60000 },
  { name: QUEUE_NAMES.MEETING_PREP, defaultPriority: 3, maxRetries: 2, backoffType: "exponential", backoffDelay: 15000 },
  { name: QUEUE_NAMES.FEEDBACK, defaultPriority: 6, maxRetries: 2, backoffType: "fixed", backoffDelay: 5000 },
  { name: QUEUE_NAMES.RETENTION, defaultPriority: 9, maxRetries: 1, backoffType: "fixed", backoffDelay: 60000 },
];

export function createQueues(connection: ConnectionOptions): Map<QueueName, Queue> {
  const queues = new Map<QueueName, Queue>();

  for (const config of QUEUE_CONFIGS) {
    const queue = new Queue(config.name, {
      connection,
      defaultJobOptions: {
        priority: config.defaultPriority,
        attempts: config.maxRetries + 1,
        backoff: {
          type: config.backoffType,
          delay: config.backoffDelay,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    });
    queues.set(config.name, queue);
  }

  return queues;
}
