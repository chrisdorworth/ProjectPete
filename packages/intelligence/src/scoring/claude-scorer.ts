import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export interface ClaudeScoreInput {
  fullName: string | null;
  company: string | null;
  title: string | null;
  signalType: string;
  signalDescription: string;
  estimatedValueDollars: number;
  county: string | null;
  enrichmentSummary: string;
}

export interface ClaudeScoreResult {
  score: number;
  summary: string;
  reason: string;
  complexityAssessment: string;
}

export async function claudeScore(input: ClaudeScoreInput): Promise<ClaudeScoreResult> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: `You are a financial advisor lead scoring assistant. Evaluate this lead for financial advisory services potential.

Lead: ${input.fullName ?? "Unknown"}
Company: ${input.company ?? "Unknown"}
Title: ${input.title ?? "Unknown"}
Signal: ${input.signalType} — ${input.signalDescription}
Estimated Value: $${input.estimatedValueDollars.toLocaleString()}
Location: ${input.county ?? "Unknown"} County
Enrichment: ${input.enrichmentSummary}

Score this lead 0-50 on qualitative factors:
- Wealth complexity (likely needs advisor)
- Life transition timing
- Approachability
- Advisory need urgency

Return JSON only:
{"score": number, "summary": "1-sentence lead summary", "reason": "why this score", "complexityAssessment": "low|medium|high"}`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return { score: 25, summary: "Unable to assess", reason: "AI error", complexityAssessment: "medium" };
  }

  try {
    return JSON.parse(content.text) as ClaudeScoreResult;
  } catch {
    return { score: 25, summary: "Parse error", reason: "Invalid AI response", complexityAssessment: "medium" };
  }
}
