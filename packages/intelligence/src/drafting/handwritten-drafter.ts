import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic { if (!client) client = new Anthropic(); return client; }

export interface HandwrittenDraftInput {
  fullName: string;
  firstName: string;
  homeAddress: string;
  signalType: string;
  rapportHooks: Array<{ type: string; value: string }>;
  advisorName: string;
}

export interface HandwrittenDraft {
  body: string;
  wordCount: number;
  bondCoFormatted: boolean;
  promptVersion: string;
}

export async function draftHandwritten(input: HandwrittenDraftInput): Promise<HandwrittenDraft> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `Draft a handwritten note from ${input.advisorName} to ${input.firstName} ${input.fullName.split(" ").pop()}.

Signal: ${input.signalType}
Rapport hooks: ${input.rapportHooks.map(h => h.value).join(", ")}

RULES:
- MAX 100 words (fits Bond.co card)
- Personal, genuine, specific
- Reference one rapport hook naturally
- Suggest meeting for coffee/call
- No sales language
- FINRA compliant

Return JSON: {"body": "..."}`,
    }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response");
  const parsed = JSON.parse(content.text) as { body: string };

  return {
    body: parsed.body,
    wordCount: parsed.body.split(/\s+/).filter(Boolean).length,
    bondCoFormatted: true,
    promptVersion: "v1.0.0",
  };
}
