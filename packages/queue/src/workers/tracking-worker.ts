import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface TrackingJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createTrackingWorker(
  connection: ConnectionOptions,
  onProcess: (outreachId: string, trackingType: string, payload: Record<string, unknown>) => Promise<{ recorded: boolean }>,
): Worker<TrackingJobData> {
  return new Worker<TrackingJobData>(
    QUEUE_NAMES.TRACKING,
    async (job: Job<TrackingJobData>) => {
      const outreachId = (job.data.payload["outreachId"] as string) ?? job.data.aggregateId;
      const trackingType = (job.data.payload["trackingType"] as string) ?? job.data.eventType;
      await job.log(`Processing ${trackingType} event for outreach: ${outreachId}`);
      const result = await onProcess(outreachId, trackingType, job.data.payload);
      await job.log(`Tracking event recorded: ${result.recorded}`);
      return result;
    },
    {
      connection,
      concurrency: 10,
    },
  );
}
