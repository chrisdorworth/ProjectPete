import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic { if (!client) client = new Anthropic(); return client; }

export interface SmsDraftInput {
  firstName: string;
  signalType: string;
  advisorName: string;
}

export interface SmsDraft {
  body: string;
  characterCount: number;
  promptVersion: string;
}

export async function draftSms(input: SmsDraftInput): Promise<SmsDraft> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 128,
    messages: [{
      role: "user",
      content: `Draft a compliant SMS from ${input.advisorName} to ${input.firstName}.

Context: Financial advisor follow-up (post-consent only)
Signal: ${input.signalType}

RULES:
- MAX 160 characters
- TCPA compliant: they opted in
- Include opt-out: "Reply STOP to opt out"
- Brief, conversational

Return JSON: {"body": "..."}`,
    }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response");
  const parsed = JSON.parse(content.text) as { body: string };

  return {
    body: parsed.body,
    characterCount: parsed.body.length,
    promptVersion: "v1.0.0",
  };
}
