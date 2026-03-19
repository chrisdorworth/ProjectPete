import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface DraftJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createDraftWorker(
  connection: ConnectionOptions,
  onProcess: (leadId: string) => Promise<{ draftsGenerated: number }>,
): Worker<DraftJobData> {
  return new Worker<DraftJobData>(
    QUEUE_NAMES.DRAFT,
    async (job: Job<DraftJobData>) => {
      const leadId = (job.data.payload["leadId"] as string) ?? job.data.aggregateId;
      await job.log(`Drafting outreach for lead: ${leadId}`);
      const result = await onProcess(leadId);
      await job.log(`Generated ${result.draftsGenerated} drafts`);
      return result;
    },
    {
      connection,
      concurrency: 5,
      limiter: {
        max: 30,
        duration: 60000,
      },
    },
  );
}
