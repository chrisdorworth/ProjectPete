import type { OutreachChannel } from "@meridian/domain";
import type { OutreachProvider, SendResult } from "./types.js";

export class OutreachDispatcher {
  private providers = new Map<string, OutreachProvider>();

  registerProvider(channel: string, provider: OutreachProvider): void {
    this.providers.set(channel, provider);
  }

  async send(params: {
    channel: string;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    recipientLinkedinUrl?: string | null;
    recipientAddress?: { name: string; street: string; city: string; state: string; zip: string } | null;
    subject?: string;
    body: string;
    fromName: string;
    fromEmail?: string;
    metadata: Record<string, string>;
  }): Promise<SendResult> {
    const provider = this.providers.get(params.channel);
    if (!provider) {
      return { success: false, error: `No provider registered for channel: ${params.channel}`, externalId: null };
    }

    try {
      return await provider.send(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message, externalId: null };
    }
  }

  async checkDeliveryStatus(channel: string, externalId: string): Promise<{ status: string; details?: string }> {
    const provider = this.providers.get(channel);
    if (!provider?.checkStatus) {
      return { status: "unknown" };
    }
    return provider.checkStatus(externalId);
  }
}
