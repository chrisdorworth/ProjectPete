import type { OutreachChannel } from "@meridian/domain";
import type { OutreachProvider, SendResult } from "./types.js";

/**
 * Function that checks whether the recipient has granted consent for
 * the given outreach channel. Integrators must supply a concrete
 * implementation (e.g. database lookup).
 */
export type ConsentChecker = (params: {
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  channel: string;
  metadata: Record<string, string>;
}) => Promise<{ consented: boolean; reason?: string }>;

export class OutreachDispatcher {
  private providers = new Map<string, OutreachProvider>();
  private consentChecker: ConsentChecker | null = null;

  registerProvider(channel: string, provider: OutreachProvider): void {
    this.providers.set(channel, provider);
  }

  /**
   * Registers a consent-checking function.  Must be called during
   * application bootstrap so that every send() verifies consent.
   */
  registerConsentChecker(checker: ConsentChecker): void {
    this.consentChecker = checker;
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
    // --- Consent verification (required before any outreach) ---
    if (!this.consentChecker) {
      return {
        success: false,
        error: "Consent checker not configured – refusing to send outreach without consent verification",
        externalId: null,
      };
    }

    const consent = await this.consentChecker({
      recipientEmail: params.recipientEmail,
      recipientPhone: params.recipientPhone,
      channel: params.channel,
      metadata: params.metadata,
    });

    if (!consent.consented) {
      return {
        success: false,
        error: `Consent not granted: ${consent.reason ?? "recipient has not opted in"}`,
        externalId: null,
      };
    }

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
