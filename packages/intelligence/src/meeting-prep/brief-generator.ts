import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic { if (!client) client = new Anthropic(); return client; }

export interface BriefInput {
  leadFullName: string;
  leadTitle: string | null;
  leadCompany: string | null;
  signalSummary: string;
  rapportHooks: Array<{ type: string; value: string }>;
  warmPaths: Array<{ clientName: string; relationship: string }>;
  compositeScore: number;
  estimatedValueDollars: number;
  competitorDetected: boolean;
  competitorName: string | null;
  householdMembers: string[];
}

export interface MeetingBrief {
  title: string;
  sections: {
    summary: string;
    signals: string;
    rapportHooks: string;
    warmPaths: string;
    financialTopics: string;
    agenda: string;
    competitorIntel: string | null;
    householdContext: string | null;
  };
  talkingPoints: string[];
  promptVersion: string;
}

export async function generateBrief(input: BriefInput): Promise<MeetingBrief> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `Generate a 1-page meeting prep brief for a financial advisor meeting with ${input.leadFullName}.

Lead: ${input.leadFullName}, ${input.leadTitle ?? ""} at ${input.leadCompany ?? ""}
Score: ${input.compositeScore}/100
Est. Value: $${input.estimatedValueDollars.toLocaleString()}
Signals: ${input.signalSummary}
Rapport Hooks: ${input.rapportHooks.map(h => `${h.type}: ${h.value}`).join(", ")}
Warm Paths: ${input.warmPaths.map(p => `${p.clientName} (${p.relationship})`).join(", ") || "None"}
Competitor: ${input.competitorDetected ? `Yes - ${input.competitorName}` : "None detected"}
Household: ${input.householdMembers.join(", ") || "Individual"}

Return JSON:
{
  "summary": "2-3 sentence executive summary",
  "signals": "Key signals and what they mean",
  "rapportHooks": "Top 3 rapport strategies",
  "financialTopics": "Relevant planning topics based on signals",
  "agenda": "Suggested 15-min meeting agenda",
  "competitorIntel": "How to handle if competitor exists, or null",
  "householdContext": "Household dynamics if applicable, or null",
  "talkingPoints": ["point1", "point2", "point3", "point4", "point5"]
}`,
    }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response");
  const parsed = JSON.parse(content.text) as {
    summary: string; signals: string; rapportHooks: string;
    financialTopics: string; agenda: string;
    competitorIntel: string | null; householdContext: string | null;
    talkingPoints: string[];
  };

  return {
    title: `Meeting Brief: ${input.leadFullName}`,
    sections: {
      summary: parsed.summary,
      signals: parsed.signals,
      rapportHooks: parsed.rapportHooks,
      warmPaths: input.warmPaths.map((p) => `${p.clientName} (${p.relationship})`).join("; ") || "No warm paths found",
      financialTopics: parsed.financialTopics,
      agenda: parsed.agenda,
      competitorIntel: parsed.competitorIntel,
      householdContext: parsed.householdContext,
    },
    talkingPoints: parsed.talkingPoints,
    promptVersion: "v1.0.0",
  };
}
