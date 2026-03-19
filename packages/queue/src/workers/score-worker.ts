import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface ScoreJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createScoreWorker(
  connection: ConnectionOptions,
  onProcess: (leadId: string) => Promise<{ score: number }>,
): Worker<ScoreJobData> {
  return new Worker<ScoreJobData>(
    QUEUE_NAMES.SCORE,
    async (job: Job<ScoreJobData>) => {
      const leadId = (job.data.payload["leadId"] as string) ?? job.data.aggregateId;
      await job.log(`Scoring lead: ${leadId}`);
      const result = await onProcess(leadId);
      await job.log(`Score: ${result.score}`);
      return result;
    },
    {
      connection,
      concurrency: 10,
    },
  );
}
