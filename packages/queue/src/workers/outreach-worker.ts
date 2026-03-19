import { Worker } from "bullmq";
import type { ConnectionOptions, Job } from "bullmq";
import { QUEUE_NAMES } from "../queues.js";

export interface OutreachJobData {
  eventId: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/** TCPA-regulated channels that require time-of-day restrictions. */
const TCPA_CHANNELS = new Set(["sms", "phone", "call"]);

/** Earliest hour (inclusive) outreach may be sent in recipient local time. */
const TCPA_EARLIEST_HOUR = 8;
/** Latest hour (exclusive) outreach may be sent in recipient local time. */
const TCPA_LATEST_HOUR = 21; // 9 PM

/**
 * Returns the current hour (0-23) in the recipient's IANA timezone.
 * Falls back to America/New_York when no timezone is provided.
 */
function getRecipientLocalHour(recipientTimezone?: string): number {
  const tz = recipientTimezone || "America/New_York";
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: tz,
  }).formatToParts(new Date());
  const hourPart = parts.find((p) => p.type === "hour");
  return Number(hourPart?.value ?? 0);
}

/**
 * Checks whether the recipient's phone number appears on the Do-Not-Call list.
 * Integrators should replace the stub with a real DNC-list lookup
 * (internal DB table or external API such as the FTC DNC registry).
 */
async function isOnDoNotCallList(recipientPhone: string | undefined | null): Promise<boolean> {
  if (!recipientPhone) return false;
  // TODO: Replace with actual DNC-list database / API lookup
  const DNC_CHECK_URL = process.env["DNC_CHECK_URL"];
  if (!DNC_CHECK_URL) {
    // If no DNC service is configured, fail-closed: block the send.
    console.warn("[outreach-worker] DNC_CHECK_URL not configured – blocking call/SMS as a precaution");
    return true;
  }
  try {
    const res = await fetch(`${DNC_CHECK_URL}?phone=${encodeURIComponent(recipientPhone)}`);
    if (!res.ok) {
      console.error(`[outreach-worker] DNC check failed with status ${res.status} – blocking send`);
      return true; // fail-closed
    }
    const data = (await res.json()) as { onList: boolean };
    return data.onList;
  } catch (err) {
    console.error("[outreach-worker] DNC check error – blocking send", err);
    return true; // fail-closed
  }
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

      // --- TCPA time-of-day guard (calls & SMS: 8 AM – 9 PM recipient local time) ---
      if (TCPA_CHANNELS.has(channel)) {
        const recipientTimezone = job.data.payload["recipientTimezone"] as string | undefined;
        const localHour = getRecipientLocalHour(recipientTimezone);

        if (localHour < TCPA_EARLIEST_HOUR || localHour >= TCPA_LATEST_HOUR) {
          await job.log(
            `TCPA block: outreach ${outreachId} via ${channel} rejected – ` +
            `recipient local hour is ${localHour} (allowed ${TCPA_EARLIEST_HOUR}:00–${TCPA_LATEST_HOUR}:00)`,
          );
          throw new Error(
            `TCPA: Cannot send ${channel} at hour ${localHour} in recipient timezone. Allowed window: ${TCPA_EARLIEST_HOUR}:00–${TCPA_LATEST_HOUR}:00.`,
          );
        }

        // --- DNC (Do-Not-Call) list check ---
        const recipientPhone = job.data.payload["recipientPhone"] as string | undefined;
        if (await isOnDoNotCallList(recipientPhone)) {
          await job.log(`DNC block: recipient phone ${recipientPhone} is on the Do-Not-Call list`);
          return { sent: false, externalId: null };
        }
      }

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
