export interface DigestData {
  repId: string;
  repName: string;
  period: "daily" | "weekly";
  date: string;
  newLeads: Array<{
    name: string;
    signalType: string;
    score: number;
    valueCents: number;
  }>;
  hotLeads: Array<{
    name: string;
    score: number;
    lastActivity: string;
    daysInPipeline: number;
  }>;
  outreachStats: {
    sent: number;
    delivered: number;
    opened: number;
    replied: number;
    bounced: number;
  };
  meetingsBooked: number;
  conversions: number;
  pipelineValueCents: number;
}

export function buildDigestHtml(data: DigestData): string {
  const formatMoney = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; }
  .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
  .header h1 { margin: 0; font-size: 20px; }
  .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
  .content { padding: 20px; }
  .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .kpi { flex: 1; background: #f8fafc; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi .value { font-size: 24px; font-weight: 700; color: #1e3a5f; }
  .kpi .label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; color: #1e3a5f; border-bottom: 2px solid #e5e7eb; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; padding: 6px 8px; background: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase; }
  td { padding: 6px 8px; border-bottom: 1px solid #f1f5f9; }
  .score { display: inline-block; width: 28px; height: 28px; line-height: 28px; text-align: center; border-radius: 50%; color: white; font-size: 11px; font-weight: 700; }
  .score-high { background: #10b981; }
  .score-med { background: #f59e0b; }
  .score-low { background: #ef4444; }
  .footer { text-align: center; font-size: 11px; color: #9ca3af; padding: 16px; border-top: 1px solid #e5e7eb; }
</style></head>
<body>
  <div class="header">
    <h1>Meridian ${data.period === "daily" ? "Daily" : "Weekly"} Digest</h1>
    <p>${data.repName} | ${data.date}</p>
  </div>
  <div class="content">
    <div class="kpi-row">
      <div class="kpi"><div class="value">${data.newLeads.length}</div><div class="label">New Leads</div></div>
      <div class="kpi"><div class="value">${data.meetingsBooked}</div><div class="label">Meetings</div></div>
      <div class="kpi"><div class="value">${data.conversions}</div><div class="label">Conversions</div></div>
      <div class="kpi"><div class="value">${formatMoney(data.pipelineValueCents)}</div><div class="label">Pipeline</div></div>
    </div>
    ${data.hotLeads.length > 0 ? `
    <div class="section">
      <h2>Hot Leads — Action Required</h2>
      <table>
        <tr><th>Lead</th><th>Score</th><th>Last Activity</th><th>Days</th></tr>
        ${data.hotLeads.map((l) => `<tr>
          <td>${l.name}</td>
          <td><span class="score ${l.score >= 75 ? "score-high" : l.score >= 50 ? "score-med" : "score-low"}">${l.score}</span></td>
          <td>${l.lastActivity}</td>
          <td>${l.daysInPipeline}</td>
        </tr>`).join("")}
      </table>
    </div>` : ""}
    ${data.newLeads.length > 0 ? `
    <div class="section">
      <h2>New Leads</h2>
      <table>
        <tr><th>Name</th><th>Signal</th><th>Score</th><th>Value</th></tr>
        ${data.newLeads.map((l) => `<tr>
          <td>${l.name}</td>
          <td>${l.signalType}</td>
          <td><span class="score ${l.score >= 75 ? "score-high" : l.score >= 50 ? "score-med" : "score-low"}">${l.score}</span></td>
          <td>${formatMoney(l.valueCents)}</td>
        </tr>`).join("")}
      </table>
    </div>` : ""}
    <div class="section">
      <h2>Outreach Performance</h2>
      <table>
        <tr><th>Metric</th><th>Count</th></tr>
        <tr><td>Sent</td><td>${data.outreachStats.sent}</td></tr>
        <tr><td>Delivered</td><td>${data.outreachStats.delivered}</td></tr>
        <tr><td>Opened</td><td>${data.outreachStats.opened}</td></tr>
        <tr><td>Replied</td><td>${data.outreachStats.replied}</td></tr>
        <tr><td>Bounced</td><td>${data.outreachStats.bounced}</td></tr>
      </table>
    </div>
  </div>
  <div class="footer">Project Meridian | Confidential | ${data.date}</div>
</body>
</html>`;
}

export function buildDigestText(data: DigestData): string {
  const formatMoney = (cents: number) => `$${Math.round(cents / 100).toLocaleString()}`;
  let text = `MERIDIAN ${data.period.toUpperCase()} DIGEST — ${data.date}\n`;
  text += `${data.repName}\n\n`;
  text += `NEW LEADS: ${data.newLeads.length} | MEETINGS: ${data.meetingsBooked} | CONVERSIONS: ${data.conversions} | PIPELINE: ${formatMoney(data.pipelineValueCents)}\n\n`;

  if (data.hotLeads.length > 0) {
    text += "HOT LEADS:\n";
    for (const l of data.hotLeads) {
      text += `  - ${l.name} (Score: ${l.score}, ${l.daysInPipeline}d in pipeline)\n`;
    }
    text += "\n";
  }

  if (data.newLeads.length > 0) {
    text += "NEW LEADS:\n";
    for (const l of data.newLeads) {
      text += `  - ${l.name} | ${l.signalType} | Score: ${l.score} | ${formatMoney(l.valueCents)}\n`;
    }
  }

  return text;
}
