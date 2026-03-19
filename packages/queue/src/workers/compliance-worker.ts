import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface ComplianceJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createComplianceWorker(
  connection: ConnectionOptions,
  onProcess: (outreachId: string, leadId: string) => Promise<{ approved: boolean }>,
): Worker<ComplianceJobData> {
  return new Worker<ComplianceJobData>(
    QUEUE_NAMES.COMPLIANCE,
    async (job: Job<ComplianceJobData>) => {
      const outreachId = job.data.aggregateId;
      const leadId = job.data.payload["leadId"] as string;
      await job.log(`Compliance review: outreach ${outreachId}`);
      const result = await onProcess(outreachId, leadId);
      await job.log(`Result: ${result.approved ? "APPROVED" : "FLAGGED"}`);
      return result;
    },
    {
      connection,
      concurrency: 10,
    },
  );
}
