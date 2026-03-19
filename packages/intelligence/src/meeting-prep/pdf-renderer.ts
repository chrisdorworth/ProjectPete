import type { MeetingBrief } from "./brief-generator.js";

export async function renderBriefToPdf(brief: MeetingBrief): Promise<Buffer> {
  const html = generateHtml(brief);

  // Use Puppeteer for PDF generation
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "Letter",
    margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    printBackground: true,
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

function generateHtml(brief: MeetingBrief): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #1a1a1a; margin: 0; padding: 0; }
    .header { background: #1e3a5f; color: white; padding: 16px 24px; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 600; }
    .header .subtitle { font-size: 11px; opacity: 0.8; margin-top: 4px; }
    .content { padding: 16px 24px; }
    .section { margin-bottom: 14px; }
    .section-title { font-size: 12px; font-weight: 700; color: #1e3a5f; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-body { font-size: 11px; }
    .talking-points { list-style: none; padding: 0; }
    .talking-points li { padding: 3px 0 3px 16px; position: relative; }
    .talking-points li::before { content: "→"; position: absolute; left: 0; color: #1e3a5f; font-weight: bold; }
    .two-col { display: flex; gap: 20px; }
    .two-col .col { flex: 1; }
    .footer { font-size: 9px; color: #999; text-align: center; margin-top: 16px; padding-top: 8px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${brief.title}</h1>
    <div class="subtitle">Generated ${new Date().toLocaleDateString()} | Confidential</div>
  </div>
  <div class="content">
    <div class="section">
      <div class="section-title">Executive Summary</div>
      <div class="section-body">${brief.sections.summary}</div>
    </div>
    <div class="two-col">
      <div class="col">
        <div class="section">
          <div class="section-title">Signals</div>
          <div class="section-body">${brief.sections.signals}</div>
        </div>
        <div class="section">
          <div class="section-title">Rapport Strategy</div>
          <div class="section-body">${brief.sections.rapportHooks}</div>
        </div>
        <div class="section">
          <div class="section-title">Warm Paths</div>
          <div class="section-body">${brief.sections.warmPaths}</div>
        </div>
      </div>
      <div class="col">
        <div class="section">
          <div class="section-title">Financial Topics</div>
          <div class="section-body">${brief.sections.financialTopics}</div>
        </div>
        <div class="section">
          <div class="section-title">Suggested Agenda</div>
          <div class="section-body">${brief.sections.agenda}</div>
        </div>
        ${brief.sections.competitorIntel ? `<div class="section"><div class="section-title">Competitor Intel</div><div class="section-body">${brief.sections.competitorIntel}</div></div>` : ""}
        ${brief.sections.householdContext ? `<div class="section"><div class="section-title">Household</div><div class="section-body">${brief.sections.householdContext}</div></div>` : ""}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Key Talking Points</div>
      <ul class="talking-points">
        ${brief.talkingPoints.map((tp) => `<li>${tp}</li>`).join("\n")}
      </ul>
    </div>
    <div class="footer">Project Meridian | ${brief.promptVersion} | For internal use only</div>
  </div>
</body>
</html>`;
}
