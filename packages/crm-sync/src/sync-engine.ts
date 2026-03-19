import type { CrmAdapter, CrmContact, CrmActivity, CrmOpportunity, SyncResult } from "./types.js";

export class CrmSyncEngine {
  private adapter: CrmAdapter | null = null;

  setAdapter(adapter: CrmAdapter): void {
    this.adapter = adapter;
  }

  getAdapterName(): string | null {
    return this.adapter?.name ?? null;
  }

  async syncLeadToContact(lead: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    title: string | null;
    city: string | null;
    state: string | null;
    signalType: string;
    score: number;
    leadId: string;
  }): Promise<SyncResult> {
    if (!this.adapter) {
      return { success: false, externalId: null, error: "No CRM adapter configured", action: "skipped" };
    }

    const contact: CrmContact = {
      externalId: "",
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      title: lead.title,
      tags: [`meridian:${lead.signalType}`, `score:${lead.score}`],
      customFields: {
        meridian_lead_id: lead.leadId,
        meridian_signal_type: lead.signalType,
        meridian_score: String(lead.score),
      },
    };

    // Check if contact already exists
    if (lead.email) {
      const existing = await this.adapter.findContact(lead.email);
      if (existing) {
        contact.externalId = existing.externalId;
      }
    }

    return this.adapter.syncContact(contact);
  }

  async syncOutreachActivity(params: {
    contactExternalId: string;
    channel: string;
    subject: string;
    body: string;
    sentAt: Date;
  }): Promise<SyncResult> {
    if (!this.adapter) {
      return { success: false, externalId: null, error: "No CRM adapter configured", action: "skipped" };
    }

    const activity: CrmActivity = {
      type: params.channel === "email" ? "email" : params.channel === "voicemail" ? "call" : "note",
      subject: params.subject,
      body: params.body,
      contactExternalId: params.contactExternalId,
      date: params.sentAt,
      metadata: { channel: params.channel, source: "meridian" },
    };

    return this.adapter.syncActivity(activity);
  }

  async syncDisposition(params: {
    contactExternalId: string;
    type: string;
    aumCents: number;
    leadName: string;
  }): Promise<SyncResult> {
    if (!this.adapter) {
      return { success: false, externalId: null, error: "No CRM adapter configured", action: "skipped" };
    }

    const stageMap: Record<string, string> = {
      meeting_booked: "Meeting Scheduled",
      qualified: "Qualified",
      proposal_sent: "Proposal",
      converted: "Closed Won",
      disqualified: "Closed Lost",
      lost: "Closed Lost",
    };

    const opportunity: CrmOpportunity = {
      contactExternalId: params.contactExternalId,
      name: `Meridian: ${params.leadName}`,
      stageName: stageMap[params.type] ?? "New",
      amountCents: params.aumCents,
      closeDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      source: "Project Meridian",
    };

    return this.adapter.syncOpportunity(opportunity);
  }
}
