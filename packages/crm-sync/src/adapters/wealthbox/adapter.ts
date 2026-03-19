import type { CrmAdapter, CrmContact, CrmActivity, CrmOpportunity, SyncResult } from "../../types.js";

export class WealthboxAdapter implements CrmAdapter {
  name = "wealthbox";

  private apiKey: string;
  private baseUrl = "https://api.crmworkspace.com/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env["WEALTHBOX_API_KEY"] ?? "";
  }

  private headers(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async syncContact(contact: CrmContact): Promise<SyncResult> {
    const payload = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      email_addresses: contact.email ? [{ address: contact.email, kind: "work" }] : [],
      phone_numbers: contact.phone ? [{ address: contact.phone, kind: "work" }] : [],
      company: contact.company,
      job_title: contact.title,
      tags: contact.tags,
      custom_fields: contact.customFields,
    };

    if (contact.externalId) {
      const response = await fetch(`${this.baseUrl}/contacts/${contact.externalId}`, {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify({ contact: payload }),
      });
      if (!response.ok) return { success: false, externalId: null, error: `Wealthbox update: ${response.status}`, action: "skipped" };
      return { success: true, externalId: contact.externalId, error: null, action: "updated" };
    }

    const response = await fetch(`${this.baseUrl}/contacts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ contact: payload }),
    });

    if (!response.ok) {
      return { success: false, externalId: null, error: `Wealthbox create: ${response.status}`, action: "skipped" };
    }

    const data = await response.json() as { contact: { id: number } };
    return { success: true, externalId: String(data.contact.id), error: null, action: "created" };
  }

  async syncActivity(activity: CrmActivity): Promise<SyncResult> {
    const taskTypeMap: Record<string, string> = {
      email: "Email",
      call: "Call",
      meeting: "Meeting",
      note: "Note",
      task: "To-Do",
    };

    const response = await fetch(`${this.baseUrl}/events`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        event: {
          title: activity.subject,
          description: activity.body,
          kind: taskTypeMap[activity.type] ?? "Note",
          linked_to: [{ id: Number(activity.contactExternalId), type: "Contact" }],
          due_date: activity.date.toISOString(),
          completed: true,
        },
      }),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Wealthbox activity: ${response.status}`, action: "skipped" };
    const data = await response.json() as { event: { id: number } };
    return { success: true, externalId: String(data.event.id), error: null, action: "created" };
  }

  async syncOpportunity(opportunity: CrmOpportunity): Promise<SyncResult> {
    const response = await fetch(`${this.baseUrl}/opportunities`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        opportunity: {
          name: opportunity.name,
          stage_name: opportunity.stageName,
          amount: opportunity.amountCents / 100,
          close_date: opportunity.closeDate.toISOString().split("T")[0],
          linked_to: [{ id: Number(opportunity.contactExternalId), type: "Contact" }],
          source: opportunity.source,
        },
      }),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Wealthbox opportunity: ${response.status}`, action: "skipped" };
    const data = await response.json() as { opportunity: { id: number } };
    return { success: true, externalId: String(data.opportunity.id), error: null, action: "created" };
  }

  async findContact(email: string): Promise<CrmContact | null> {
    const response = await fetch(`${this.baseUrl}/contacts?search=${encodeURIComponent(email)}`, {
      headers: this.headers(),
    });

    if (!response.ok) return null;

    const data = await response.json() as { contacts: Array<{ id: number; first_name: string; last_name: string; email_addresses: Array<{ address: string }>; phone_numbers: Array<{ address: string }>; company: string; job_title: string; tags: string[] }> };
    const match = data.contacts[0];
    if (!match) return null;

    return {
      externalId: String(match.id),
      firstName: match.first_name,
      lastName: match.last_name,
      email: match.email_addresses[0]?.address ?? null,
      phone: match.phone_numbers[0]?.address ?? null,
      company: match.company,
      title: match.job_title,
      tags: match.tags ?? [],
      customFields: {},
    };
  }

  async testConnection(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/contacts?per_page=1`, { headers: this.headers() });
    return response.ok;
  }
}
