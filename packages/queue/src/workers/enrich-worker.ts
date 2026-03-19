import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface EnrichJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createEnrichWorker(
  connection: ConnectionOptions,
  onProcess: (leadId: string, payload: Record<string, unknown>) => Promise<void>,
): Worker<EnrichJobData> {
  return new Worker<EnrichJobData>(
    QUEUE_NAMES.ENRICH,
    async (job: Job<EnrichJobData>) => {
      const leadId = (job.data.payload["leadId"] as string) ?? job.data.aggregateId;
      await job.log(`Enriching lead: ${leadId}`);
      await onProcess(leadId, job.data.payload);
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 20,
        duration: 60000,
      },
    },
  );
}
