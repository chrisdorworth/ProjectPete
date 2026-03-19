import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface DigestJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createDigestWorker(
  connection: ConnectionOptions,
  onProcess: (userId: string, payload: Record<string, unknown>) => Promise<{ briefingId: string; itemCount: number }>,
): Worker<DigestJobData> {
  return new Worker<DigestJobData>(
    QUEUE_NAMES.DIGEST,
    async (job: Job<DigestJobData>) => {
      const userId = (job.data.payload["userId"] as string) ?? job.data.aggregateId;
      await job.log(`Generating morning top-10 briefing for user: ${userId}`);
      const result = await onProcess(userId, job.data.payload);
      await job.log(`Briefing ${result.briefingId} generated with ${result.itemCount} items`);
      return result;
    },
    {
      connection,
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000,
      },
    },
  );
}
