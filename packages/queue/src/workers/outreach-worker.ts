import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface OutreachJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createOutreachWorker(
  connection: ConnectionOptions,
  onProcess: (outreachId: string, channel: string) => Promise<{ sent: boolean; externalId: string | null }>,
): Worker<OutreachJobData> {
  return new Worker<OutreachJobData>(
    QUEUE_NAMES.OUTREACH,
    async (job: Job<OutreachJobData>) => {
      const outreachId = (job.data.payload["outreachId"] as string) ?? job.data.aggregateId;
      const channel = job.data.payload["channel"] as string ?? "email";
      await job.log(`Sending outreach ${outreachId} via ${channel}`);
      const result = await onProcess(outreachId, channel);
      await job.log(`Sent: ${result.sent}, externalId: ${result.externalId}`);
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
