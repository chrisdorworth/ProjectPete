import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface MeetingPrepJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createMeetingPrepWorker(
  connection: ConnectionOptions,
  onProcess: (meetingId: string, leadId: string, payload: Record<string, unknown>) => Promise<{ briefId: string; sectionsGenerated: number }>,
): Worker<MeetingPrepJobData> {
  return new Worker<MeetingPrepJobData>(
    QUEUE_NAMES.MEETING_PREP,
    async (job: Job<MeetingPrepJobData>) => {
      const meetingId = (job.data.payload["meetingId"] as string) ?? job.data.aggregateId;
      const leadId = job.data.payload["leadId"] as string;
      await job.log(`Auto-generating brief for scheduled call: ${meetingId}`);
      const result = await onProcess(meetingId, leadId, job.data.payload);
      await job.log(`Brief ${result.briefId} generated with ${result.sectionsGenerated} sections`);
      return result;
    },
    {
      connection,
      concurrency: 3,
      limiter: {
        max: 15,
        duration: 60000,
      },
    },
  );
}
