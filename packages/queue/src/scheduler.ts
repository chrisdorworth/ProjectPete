import type { Queue } from "bullmq";
import type { QueueName } from "./queues.js";
import { QUEUE_NAMES } from "./queues.js";

export interface CrawlSchedule {
  crawlerName: string;
  cron: string;
  priority: number;
  enabled: boolean;
}

export const DEFAULT_CRAWL_SCHEDULES: CrawlSchedule[] = [
  // Tier 1 — Government (daily/twice-daily)
  { crawlerName: "clerk-orange", cron: "0 6,18 * * *", priority: 1, enabled: true },
  { crawlerName: "clerk-seminole", cron: "0 6,18 * * *", priority: 1, enabled: true },
  { crawlerName: "clerk-brevard", cron: "0 7 * * *", priority: 2, enabled: true },
  { crawlerName: "clerk-osceola", cron: "0 7 * * *", priority: 2, enabled: true },
  { crawlerName: "clerk-volusia", cron: "0 7 * * *", priority: 2, enabled: true },
  { crawlerName: "clerk-lake", cron: "0 7 * * *", priority: 2, enabled: true },
  { crawlerName: "clerk-broward", cron: "0 8 * * *", priority: 3, enabled: true },
  { crawlerName: "clerk-palm-beach", cron: "0 8 * * *", priority: 3, enabled: true },
  { crawlerName: "clerk-hillsborough", cron: "0 8 * * *", priority: 3, enabled: true },
  { crawlerName: "clerk-pinellas", cron: "0 8 * * *", priority: 3, enabled: true },
  { crawlerName: "clerk-duval", cron: "0 9 * * *", priority: 3, enabled: true },
  { crawlerName: "sec-edgar", cron: "0 5 * * 1-5", priority: 1, enabled: true },
  { crawlerName: "probate-orange", cron: "0 10 * * *", priority: 2, enabled: true },
  { crawlerName: "probate-seminole", cron: "0 10 * * *", priority: 2, enabled: true },
  { crawlerName: "sunbiz-dissolution", cron: "0 11 * * 1-5", priority: 3, enabled: true },
  { crawlerName: "sunbiz-merger", cron: "0 11 * * 1-5", priority: 3, enabled: true },
  { crawlerName: "property-appraiser-orange", cron: "0 12 * * 1", priority: 4, enabled: true },

  // Tier 2 — Regulatory (daily or weekly)
  { crawlerName: "pacer-bankruptcy", cron: "0 6 * * 1-5", priority: 3, enabled: true },
  { crawlerName: "fl-medical-board", cron: "0 13 * * 1", priority: 4, enabled: true },
  { crawlerName: "fl-bar-association", cron: "0 13 * * 1", priority: 4, enabled: true },
  { crawlerName: "fl-salary-db", cron: "0 14 * * 1", priority: 5, enabled: true },
  { crawlerName: "uspto-assignments", cron: "0 15 * * 3", priority: 5, enabled: true },

  // Tier 3 — Commercial (daily)
  { crawlerName: "google-news", cron: "0 5,12,19 * * *", priority: 3, enabled: true },
  { crawlerName: "business-journals", cron: "0 6 * * 1-5", priority: 3, enabled: true },
  { crawlerName: "linkedin-status", cron: "0 7 * * 1-5", priority: 4, enabled: true },
  { crawlerName: "commercial-re", cron: "0 16 * * 1,4", priority: 5, enabled: true },

  // Tier 4 — Behavioral (weekly)
  { crawlerName: "bombora-intent", cron: "0 4 * * 1", priority: 5, enabled: true },
  { crawlerName: "linkedin-posts", cron: "0 8 * * 1-5", priority: 6, enabled: true },

  // Digest + Retention
  { crawlerName: "digest-morning", cron: "0 6 * * 1-5", priority: 1, enabled: true },
  { crawlerName: "retention-check", cron: "0 2 1 * *", priority: 9, enabled: true },
];

export async function registerSchedules(
  queues: Map<QueueName, Queue>,
  schedules: CrawlSchedule[] = DEFAULT_CRAWL_SCHEDULES,
): Promise<void> {
  const crawlQueue = queues.get(QUEUE_NAMES.CRAWL);
  const digestQueue = queues.get(QUEUE_NAMES.DIGEST);
  const retentionQueue = queues.get(QUEUE_NAMES.RETENTION);

  if (!crawlQueue) return;

  for (const schedule of schedules) {
    if (!schedule.enabled) continue;

    let targetQueue = crawlQueue;
    if (schedule.crawlerName === "digest-morning" && digestQueue) {
      targetQueue = digestQueue;
    } else if (schedule.crawlerName === "retention-check" && retentionQueue) {
      targetQueue = retentionQueue;
    }

    await targetQueue.upsertJobScheduler(
      schedule.crawlerName,
      { pattern: schedule.cron },
      {
        name: schedule.crawlerName,
        data: { crawlerName: schedule.crawlerName },
        opts: { priority: schedule.priority },
      },
    );
  }
}
