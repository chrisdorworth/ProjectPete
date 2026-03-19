import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface CrawlJobData {
  crawlerName: string;
}

export function createCrawlWorker(
  connection: ConnectionOptions,
  onProcess: (crawlerName: string) => Promise<{ signalsFound: number }>,
): Worker<CrawlJobData> {
  return new Worker<CrawlJobData>(
    QUEUE_NAMES.CRAWL,
    async (job: Job<CrawlJobData>) => {
      const { crawlerName } = job.data;
      await job.log(`Starting crawler: ${crawlerName}`);

      const result = await onProcess(crawlerName);

      await job.log(`Completed: ${result.signalsFound} signals found`);
      return result;
    },
    {
      connection,
      concurrency: 4,
      limiter: {
        max: 10,
        duration: 60000,
      },
    },
  );
}
