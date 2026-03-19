import type { CrmAdapter, CrmContact, CrmActivity, CrmOpportunity, SyncResult } from "../../types.js";

export class RedtailAdapter implements CrmAdapter {
  name = "redtail";

  private apiKey: string;
  private userKey: string;
  private baseUrl = "https://smf.crm3.redtailtechnology.com/api/public/v1";

  constructor(apiKey?: string, userKey?: string) {
    this.apiKey = apiKey ?? process.env["REDTAIL_API_KEY"] ?? "";
    this.userKey = userKey ?? process.env["REDTAIL_USER_KEY"] ?? "";
  }

  private headers(): Record<string, string> {
    return {
      "Authorization": `Userkeyauth ${this.userKey}`,
      "Content-Type": "application/json",
      "include": "addresses,emails,phones",
    };
  }

  async syncContact(contact: CrmContact): Promise<SyncResult> {
    const payload = {
      first_name: contact.firstName,
      last_name: contact.lastName,
      company_name: contact.company,
      job_title: contact.title,
      emails: contact.email ? [{ address: contact.email, email_type: "Work" }] : [],
      phones: contact.phone ? [{ number: contact.phone, phone_type: "Work" }] : [],
      tag_list: contact.tags.join(","),
    };

    if (contact.externalId) {
      const response = await fetch(`${this.baseUrl}/contacts/${contact.externalId}`, {
        method: "PUT",
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) return { success: false, externalId: null, error: `Redtail update: ${response.status}`, action: "skipped" };
      return { success: true, externalId: contact.externalId, error: null, action: "updated" };
    }

    const response = await fetch(`${this.baseUrl}/contacts`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Redtail create: ${response.status}`, action: "skipped" };
    const data = await response.json() as { contact: { id: number } };
    return { success: true, externalId: String(data.contact.id), error: null, action: "created" };
  }

  async syncActivity(activity: CrmActivity): Promise<SyncResult> {
    const activityTypeMap: Record<string, string> = {
      email: "Email",
      call: "Phone Call",
      meeting: "Meeting",
      note: "Note",
      task: "Task",
    };

    const response = await fetch(`${this.baseUrl}/activities`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        subject: activity.subject,
        body: activity.body,
        activity_type: activityTypeMap[activity.type] ?? "Note",
        contact_id: Number(activity.contactExternalId),
        start_date: activity.date.toISOString(),
        completed: true,
      }),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Redtail activity: ${response.status}`, action: "skipped" };
    const data = await response.json() as { activity: { id: number } };
    return { success: true, externalId: String(data.activity.id), error: null, action: "created" };
  }

  async syncOpportunity(opportunity: CrmOpportunity): Promise<SyncResult> {
    const response = await fetch(`${this.baseUrl}/opportunities`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        name: opportunity.name,
        stage: opportunity.stageName,
        value: opportunity.amountCents / 100,
        close_date: opportunity.closeDate.toISOString().split("T")[0],
        contact_id: Number(opportunity.contactExternalId),
        source: opportunity.source,
      }),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Redtail opportunity: ${response.status}`, action: "skipped" };
    const data = await response.json() as { opportunity: { id: number } };
    return { success: true, externalId: String(data.opportunity.id), error: null, action: "created" };
  }

  async findContact(email: string): Promise<CrmContact | null> {
    const response = await fetch(`${this.baseUrl}/contacts/search?email=${encodeURIComponent(email)}`, {
      headers: this.headers(),
    });

    if (!response.ok) return null;
    const data = await response.json() as { contacts: Array<{ id: number; first_name: string; last_name: string; emails: Array<{ address: string }>; phones: Array<{ number: string }>; company_name: string; job_title: string; tag_list: string }> };
    const match = data.contacts[0];
    if (!match) return null;

    return {
      externalId: String(match.id),
      firstName: match.first_name,
      lastName: match.last_name,
      email: match.emails[0]?.address ?? null,
      phone: match.phones[0]?.number ?? null,
      company: match.company_name,
      title: match.job_title,
      tags: match.tag_list?.split(",") ?? [],
      customFields: {},
    };
  }

  async testConnection(): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/contacts?page_size=1`, { headers: this.headers() });
    return response.ok;
  }
}
