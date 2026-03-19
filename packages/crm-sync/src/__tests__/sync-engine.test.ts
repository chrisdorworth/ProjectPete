import { describe, it, expect, vi, beforeEach } from "vitest";
import { CrmSyncEngine } from "../sync-engine.js";
import type { CrmAdapter, CrmContact, CrmActivity, CrmOpportunity, SyncResult } from "../types.js";

function makeAdapter(overrides: Partial<CrmAdapter> = {}): CrmAdapter {
  return {
    name: overrides.name ?? "mock-crm",
    syncContact: overrides.syncContact ?? vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "crm-contact-1", error: null, action: "created",
    })),
    syncActivity: overrides.syncActivity ?? vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "crm-activity-1", error: null, action: "created",
    })),
    syncOpportunity: overrides.syncOpportunity ?? vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "crm-opp-1", error: null, action: "created",
    })),
    findContact: overrides.findContact ?? vi.fn(async () => null),
    testConnection: overrides.testConnection ?? vi.fn(async () => true),
  };
}

const baseLead = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@example.com",
  phone: "+15551234567",
  company: "Acme Corp",
  title: "CFO",
  city: "Denver",
  state: "CO",
  signalType: "401k_rollover",
  score: 85,
  leadId: "lead-42",
};

describe("CrmSyncEngine", () => {
  let engine: CrmSyncEngine;

  beforeEach(() => {
    engine = new CrmSyncEngine();
  });

  it("syncLeadToContact creates a contact via the adapter", async () => {
    const syncContact = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "crm-c-1", error: null, action: "created",
    }));
    const adapter = makeAdapter({ syncContact });
    engine.setAdapter(adapter);

    const result = await engine.syncLeadToContact(baseLead);

    expect(result.success).toBe(true);
    expect(result.externalId).toBe("crm-c-1");
    expect(syncContact).toHaveBeenCalledTimes(1);

    const contact = syncContact.mock.calls[0]![0] as CrmContact;
    expect(contact.firstName).toBe("Jane");
    expect(contact.lastName).toBe("Doe");
    expect(contact.tags).toContain("meridian:401k_rollover");
    expect(contact.tags).toContain("score:85");
    expect(contact.customFields.meridian_lead_id).toBe("lead-42");
  });

  it("syncLeadToContact returns error when no adapter is configured", async () => {
    const result = await engine.syncLeadToContact(baseLead);

    expect(result.success).toBe(false);
    expect(result.error).toBe("No CRM adapter configured");
    expect(result.action).toBe("skipped");
    expect(result.externalId).toBeNull();
  });

  it("looks up existing contact by email before creating", async () => {
    const existingContact: CrmContact = {
      externalId: "existing-crm-id",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      phone: null,
      company: null,
      title: null,
      tags: [],
      customFields: {},
    };
    const findContact = vi.fn(async () => existingContact);
    const syncContact = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "existing-crm-id", error: null, action: "updated",
    }));
    const adapter = makeAdapter({ findContact, syncContact });
    engine.setAdapter(adapter);

    const result = await engine.syncLeadToContact(baseLead);

    expect(findContact).toHaveBeenCalledWith("jane@example.com");
    const contact = syncContact.mock.calls[0]![0] as CrmContact;
    expect(contact.externalId).toBe("existing-crm-id");
    expect(result.success).toBe(true);
  });

  it("skips contact lookup when lead has no email", async () => {
    const findContact = vi.fn(async () => null);
    const adapter = makeAdapter({ findContact });
    engine.setAdapter(adapter);

    await engine.syncLeadToContact({ ...baseLead, email: null });

    expect(findContact).not.toHaveBeenCalled();
  });

  it("syncOutreachActivity creates an activity with correct type mapping", async () => {
    const syncActivity = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "act-1", error: null, action: "created",
    }));
    const adapter = makeAdapter({ syncActivity });
    engine.setAdapter(adapter);

    const sentAt = new Date("2026-03-15T10:00:00Z");

    // email channel maps to "email" type
    await engine.syncOutreachActivity({
      contactExternalId: "crm-c-1",
      channel: "email",
      subject: "Portfolio Review",
      body: "Hello!",
      sentAt,
    });

    const activity = syncActivity.mock.calls[0]![0] as CrmActivity;
    expect(activity.type).toBe("email");
    expect(activity.subject).toBe("Portfolio Review");
    expect(activity.contactExternalId).toBe("crm-c-1");
    expect(activity.metadata.source).toBe("meridian");
  });

  it("syncOutreachActivity maps voicemail to call type", async () => {
    const syncActivity = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "act-2", error: null, action: "created",
    }));
    const adapter = makeAdapter({ syncActivity });
    engine.setAdapter(adapter);

    await engine.syncOutreachActivity({
      contactExternalId: "crm-c-1",
      channel: "voicemail",
      subject: "Follow up",
      body: "Left voicemail",
      sentAt: new Date(),
    });

    const activity = syncActivity.mock.calls[0]![0] as CrmActivity;
    expect(activity.type).toBe("call");
  });

  it("syncOutreachActivity maps sms to note type", async () => {
    const syncActivity = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "act-3", error: null, action: "created",
    }));
    const adapter = makeAdapter({ syncActivity });
    engine.setAdapter(adapter);

    await engine.syncOutreachActivity({
      contactExternalId: "crm-c-1",
      channel: "sms",
      subject: "Text",
      body: "Hi",
      sentAt: new Date(),
    });

    const activity = syncActivity.mock.calls[0]![0] as CrmActivity;
    expect(activity.type).toBe("note");
  });

  it("syncOutreachActivity returns error without adapter", async () => {
    const result = await engine.syncOutreachActivity({
      contactExternalId: "crm-c-1",
      channel: "email",
      subject: "Test",
      body: "Hi",
      sentAt: new Date(),
    });

    expect(result.success).toBe(false);
    expect(result.action).toBe("skipped");
  });

  it("syncDisposition maps meeting_booked to Meeting Scheduled", async () => {
    const syncOpportunity = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "opp-1", error: null, action: "created",
    }));
    const adapter = makeAdapter({ syncOpportunity });
    engine.setAdapter(adapter);

    await engine.syncDisposition({
      contactExternalId: "crm-c-1",
      type: "meeting_booked",
      aumCents: 50000000,
      leadName: "Jane Doe",
    });

    const opp = syncOpportunity.mock.calls[0]![0] as CrmOpportunity;
    expect(opp.stageName).toBe("Meeting Scheduled");
    expect(opp.name).toBe("Meridian: Jane Doe");
    expect(opp.amountCents).toBe(50000000);
    expect(opp.source).toBe("Project Meridian");
  });

  it("syncDisposition maps converted to Closed Won", async () => {
    const syncOpportunity = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "opp-2", error: null, action: "created",
    }));
    const adapter = makeAdapter({ syncOpportunity });
    engine.setAdapter(adapter);

    await engine.syncDisposition({
      contactExternalId: "crm-c-1",
      type: "converted",
      aumCents: 100000000,
      leadName: "Big Client",
    });

    const opp = syncOpportunity.mock.calls[0]![0] as CrmOpportunity;
    expect(opp.stageName).toBe("Closed Won");
  });

  it("syncDisposition defaults unknown type to New stage", async () => {
    const syncOpportunity = vi.fn(async (): Promise<SyncResult> => ({
      success: true, externalId: "opp-3", error: null, action: "created",
    }));
    const adapter = makeAdapter({ syncOpportunity });
    engine.setAdapter(adapter);

    await engine.syncDisposition({
      contactExternalId: "crm-c-1",
      type: "some_unknown_type",
      aumCents: 0,
      leadName: "Unknown",
    });

    const opp = syncOpportunity.mock.calls[0]![0] as CrmOpportunity;
    expect(opp.stageName).toBe("New");
  });

  it("syncDisposition returns error without adapter", async () => {
    const result = await engine.syncDisposition({
      contactExternalId: "crm-c-1",
      type: "meeting_booked",
      aumCents: 0,
      leadName: "Test",
    });

    expect(result.success).toBe(false);
    expect(result.action).toBe("skipped");
  });

  it("getAdapterName returns null when no adapter is set", () => {
    expect(engine.getAdapterName()).toBeNull();
  });

  it("getAdapterName returns the adapter name after setting", () => {
    engine.setAdapter(makeAdapter({ name: "salesforce" }));
    expect(engine.getAdapterName()).toBe("salesforce");
  });
});
