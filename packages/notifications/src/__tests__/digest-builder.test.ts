import { describe, it, expect } from "vitest";
import { buildDigestHtml, buildDigestText } from "../digest-builder.js";
import type { DigestData } from "../digest-builder.js";

function makeDigestData(overrides: Partial<DigestData> = {}): DigestData {
  return {
    repId: "rep-1",
    repName: "Sarah Johnson",
    period: "daily",
    date: "2026-03-19",
    newLeads: overrides.newLeads ?? [
      { name: "Alice Smith", signalType: "401k_rollover", score: 92, valueCents: 75000000 },
      { name: "Bob Chen", signalType: "retirement", score: 65, valueCents: 30000000 },
    ],
    hotLeads: overrides.hotLeads ?? [
      { name: "Carlos Reyes", score: 88, lastActivity: "Email opened", daysInPipeline: 3 },
    ],
    outreachStats: overrides.outreachStats ?? {
      sent: 45,
      delivered: 42,
      opened: 18,
      replied: 5,
      bounced: 3,
    },
    meetingsBooked: overrides.meetingsBooked ?? 3,
    conversions: overrides.conversions ?? 1,
    pipelineValueCents: overrides.pipelineValueCents ?? 250000000,
    ...overrides,
  };
}

describe("buildDigestHtml", () => {
  it("generates valid HTML with doctype and structure", () => {
    const html = buildDigestHtml(makeDigestData());

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html>");
    expect(html).toContain("</html>");
    expect(html).toContain("<body>");
    expect(html).toContain("</body>");
  });

  it("includes the Daily header for daily period", () => {
    const html = buildDigestHtml(makeDigestData({ period: "daily" }));

    expect(html).toContain("Meridian Daily Digest");
    expect(html).toContain("Sarah Johnson");
    expect(html).toContain("2026-03-19");
  });

  it("includes the Weekly header for weekly period", () => {
    const html = buildDigestHtml(makeDigestData({ period: "weekly" }));

    expect(html).toContain("Meridian Weekly Digest");
  });

  it("includes KPI values in the output", () => {
    const html = buildDigestHtml(makeDigestData({
      meetingsBooked: 7,
      conversions: 2,
      pipelineValueCents: 500000000,
    }));

    // New Leads count
    expect(html).toContain(">2<");
    // Meetings
    expect(html).toContain(">7<");
    // Conversions
    expect(html).toContain(">2<");
    // Pipeline value $5,000,000
    expect(html).toContain("$5,000,000");
  });

  it("formats money in cents correctly", () => {
    const html = buildDigestHtml(makeDigestData({ pipelineValueCents: 12345600 }));

    // $123,456
    expect(html).toContain("$123,456");
  });

  it("renders hot leads table when hot leads exist", () => {
    const html = buildDigestHtml(makeDigestData());

    expect(html).toContain("Hot Leads");
    expect(html).toContain("Carlos Reyes");
    expect(html).toContain("score-high"); // score 88 >= 75
  });

  it("omits hot leads section when list is empty", () => {
    const html = buildDigestHtml(makeDigestData({ hotLeads: [] }));

    expect(html).not.toContain("Hot Leads");
  });

  it("omits new leads section when list is empty", () => {
    const html = buildDigestHtml(makeDigestData({ newLeads: [] }));

    expect(html).not.toContain("New Leads</h2>");
  });

  it("renders new leads with correct score classes", () => {
    const html = buildDigestHtml(makeDigestData({
      newLeads: [
        { name: "High", signalType: "test", score: 80, valueCents: 100000 },
        { name: "Med", signalType: "test", score: 60, valueCents: 100000 },
        { name: "Low", signalType: "test", score: 30, valueCents: 100000 },
      ],
    }));

    expect(html).toContain("score-high");
    expect(html).toContain("score-med");
    expect(html).toContain("score-low");
  });

  it("includes outreach stats in the table", () => {
    const html = buildDigestHtml(makeDigestData());

    expect(html).toContain("Outreach Performance");
    expect(html).toContain(">45<");
    expect(html).toContain(">42<");
    expect(html).toContain(">18<");
  });

  it("includes the footer with date", () => {
    const html = buildDigestHtml(makeDigestData());

    expect(html).toContain("Project Meridian");
    expect(html).toContain("Confidential");
    expect(html).toContain("2026-03-19");
  });
});

describe("buildDigestText", () => {
  it("generates a plain text digest with header", () => {
    const text = buildDigestText(makeDigestData());

    expect(text).toContain("MERIDIAN DAILY DIGEST");
    expect(text).toContain("2026-03-19");
    expect(text).toContain("Sarah Johnson");
  });

  it("uses WEEKLY for weekly period", () => {
    const text = buildDigestText(makeDigestData({ period: "weekly" }));

    expect(text).toContain("MERIDIAN WEEKLY DIGEST");
  });

  it("includes KPI summary line", () => {
    const text = buildDigestText(makeDigestData());

    expect(text).toContain("NEW LEADS: 2");
    expect(text).toContain("MEETINGS: 3");
    expect(text).toContain("CONVERSIONS: 1");
    expect(text).toContain("PIPELINE: $2,500,000");
  });

  it("lists hot leads with scores and pipeline days", () => {
    const text = buildDigestText(makeDigestData());

    expect(text).toContain("HOT LEADS:");
    expect(text).toContain("Carlos Reyes (Score: 88, 3d in pipeline)");
  });

  it("omits hot leads section when empty", () => {
    const text = buildDigestText(makeDigestData({ hotLeads: [] }));

    expect(text).not.toContain("HOT LEADS:");
  });

  it("lists new leads with signal types and values", () => {
    const text = buildDigestText(makeDigestData());

    expect(text).toContain("NEW LEADS:");
    expect(text).toContain("Alice Smith | 401k_rollover | Score: 92 | $750,000");
  });

  it("omits new leads section when empty", () => {
    const text = buildDigestText(makeDigestData({ newLeads: [] }));

    // The KPI line will still say "NEW LEADS: 0" but the section header should not appear twice
    const lines = text.split("\n");
    const newLeadHeaders = lines.filter((l) => l.trim() === "NEW LEADS:");
    expect(newLeadHeaders.length).toBe(0);
  });
});
