import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface FeedbackJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createFeedbackWorker(
  connection: ConnectionOptions,
  onProcess: (outreachId: string, disposition: string, payload: Record<string, unknown>) => Promise<{ featureStoreUpdated: boolean }>,
): Worker<FeedbackJobData> {
  return new Worker<FeedbackJobData>(
    QUEUE_NAMES.FEEDBACK,
    async (job: Job<FeedbackJobData>) => {
      const outreachId = (job.data.payload["outreachId"] as string) ?? job.data.aggregateId;
      const disposition = job.data.payload["disposition"] as string;
      await job.log(`Recording disposition "${disposition}" for outreach: ${outreachId}`);
      const result = await onProcess(outreachId, disposition, job.data.payload);
      await job.log(`Feature store updated: ${result.featureStoreUpdated}`);
      return result;
    },
    {
      connection,
      concurrency: 8,
    },
  );
}
