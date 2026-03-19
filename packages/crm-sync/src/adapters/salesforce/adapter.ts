import type { CrmAdapter, CrmContact, CrmActivity, CrmOpportunity, SyncResult } from "../../types.js";

export class SalesforceAdapter implements CrmAdapter {
  name = "salesforce";

  private instanceUrl: string;
  private accessToken: string;

  constructor(instanceUrl?: string, accessToken?: string) {
    this.instanceUrl = instanceUrl ?? process.env["SF_INSTANCE_URL"] ?? "";
    this.accessToken = accessToken ?? process.env["SF_ACCESS_TOKEN"] ?? "";
  }

  private headers(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
    };
  }

  private apiUrl(path: string): string {
    return `${this.instanceUrl}/services/data/v59.0${path}`;
  }

  async syncContact(contact: CrmContact): Promise<SyncResult> {
    const payload = {
      FirstName: contact.firstName,
      LastName: contact.lastName ?? "Unknown",
      Email: contact.email,
      Phone: contact.phone,
      Company: contact.company ?? "Unknown",
      Title: contact.title,
      LeadSource: "Project Meridian",
      Description: `Tags: ${contact.tags.join(", ")}`,
    };

    if (contact.externalId) {
      const response = await fetch(this.apiUrl(`/sobjects/Lead/${contact.externalId}`), {
        method: "PATCH",
        headers: this.headers(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) return { success: false, externalId: null, error: `Salesforce update: ${response.status}`, action: "skipped" };
      return { success: true, externalId: contact.externalId, error: null, action: "updated" };
    }

    const response = await fetch(this.apiUrl("/sobjects/Lead"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Salesforce create: ${response.status}`, action: "skipped" };
    const data = await response.json() as { id: string };
    return { success: true, externalId: data.id, error: null, action: "created" };
  }

  async syncActivity(activity: CrmActivity): Promise<SyncResult> {
    const payload = {
      Subject: activity.subject,
      Description: activity.body,
      WhoId: activity.contactExternalId,
      ActivityDate: activity.date.toISOString().split("T")[0],
      Status: "Completed",
      Type: activity.type === "call" ? "Call" : activity.type === "email" ? "Email" : "Other",
    };

    const response = await fetch(this.apiUrl("/sobjects/Task"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Salesforce task: ${response.status}`, action: "skipped" };
    const data = await response.json() as { id: string };
    return { success: true, externalId: data.id, error: null, action: "created" };
  }

  async syncOpportunity(opportunity: CrmOpportunity): Promise<SyncResult> {
    const payload = {
      Name: opportunity.name,
      StageName: opportunity.stageName,
      Amount: opportunity.amountCents / 100,
      CloseDate: opportunity.closeDate.toISOString().split("T")[0],
      LeadSource: opportunity.source,
    };

    const response = await fetch(this.apiUrl("/sobjects/Opportunity"), {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) return { success: false, externalId: null, error: `Salesforce opportunity: ${response.status}`, action: "skipped" };
    const data = await response.json() as { id: string };
    return { success: true, externalId: data.id, error: null, action: "created" };
  }

  async findContact(email: string): Promise<CrmContact | null> {
    const query = `SELECT Id, FirstName, LastName, Email, Phone, Company, Title FROM Lead WHERE Email = '${email.replace(/'/g, "\\'")}' LIMIT 1`;
    const response = await fetch(this.apiUrl(`/query?q=${encodeURIComponent(query)}`), {
      headers: this.headers(),
    });

    if (!response.ok) return null;
    const data = await response.json() as { records: Array<{ Id: string; FirstName: string; LastName: string; Email: string; Phone: string; Company: string; Title: string }> };
    const match = data.records[0];
    if (!match) return null;

    return {
      externalId: match.Id,
      firstName: match.FirstName,
      lastName: match.LastName,
      email: match.Email,
      phone: match.Phone,
      company: match.Company,
      title: match.Title,
      tags: [],
      customFields: {},
    };
  }

  async testConnection(): Promise<boolean> {
    const response = await fetch(this.apiUrl("/sobjects"), { headers: this.headers() });
    return response.ok;
  }
}
