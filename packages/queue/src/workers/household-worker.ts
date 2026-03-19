import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface HouseholdJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createHouseholdWorker(
  connection: ConnectionOptions,
  onProcess: (leadId: string, payload: Record<string, unknown>) => Promise<{ householdId: string; membersLinked: number }>,
): Worker<HouseholdJobData> {
  return new Worker<HouseholdJobData>(
    QUEUE_NAMES.HOUSEHOLD,
    async (job: Job<HouseholdJobData>) => {
      const leadId = (job.data.payload["leadId"] as string) ?? job.data.aggregateId;
      await job.log(`Processing household formation for lead: ${leadId}`);
      const result = await onProcess(leadId, job.data.payload);
      await job.log(`Household ${result.householdId}: ${result.membersLinked} members linked`);
      return result;
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
