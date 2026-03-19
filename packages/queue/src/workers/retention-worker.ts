import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface RetentionJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createRetentionWorker(
  connection: ConnectionOptions,
  onProcess: (policyName: string, payload: Record<string, unknown>) => Promise<{ recordsPurged: number; recordsArchived: number }>,
): Worker<RetentionJobData> {
  return new Worker<RetentionJobData>(
    QUEUE_NAMES.RETENTION,
    async (job: Job<RetentionJobData>) => {
      const policyName = (job.data.payload["policyName"] as string) ?? job.data.aggregateId;
      await job.log(`Enforcing data retention policy: ${policyName}`);
      const result = await onProcess(policyName, job.data.payload);
      await job.log(`Retention complete: ${result.recordsPurged} purged, ${result.recordsArchived} archived`);
      return result;
    },
    {
      connection,
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60000,
      },
    },
  );
}
