import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface GraphSyncJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

export function createGraphSyncWorker(
  connection: ConnectionOptions,
  onProcess: (eventId: string, eventType: string, payload: Record<string, unknown>) => Promise<{ nodesUpserted: number; edgesUpserted: number }>,
): Worker<GraphSyncJobData> {
  return new Worker<GraphSyncJobData>(
    QUEUE_NAMES.GRAPH_SYNC,
    async (job: Job<GraphSyncJobData>) => {
      const { eventId, eventType, payload } = job.data;
      await job.log(`Syncing event ${eventId} (${eventType}) to Neo4j graph`);
      const result = await onProcess(eventId, eventType, payload);
      await job.log(`Graph updated: ${result.nodesUpserted} nodes, ${result.edgesUpserted} edges`);
      return result;
    },
    {
      connection,
      concurrency: 8,
      limiter: {
        max: 30,
        duration: 60000,
      },
    },
  );
}
