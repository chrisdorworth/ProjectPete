import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic { if (!client) client = new Anthropic(); return client; }

export interface LinkedInDraftInput {
  fullName: string;
  company: string | null;
  title: string | null;
  rapportHooks: Array<{ type: string; value: string }>;
  warmPath: { clientName: string; relationship: string } | null;
  advisorName: string;
}

export interface LinkedInDraft {
  connectionNote: string;
  inMailBody: string | null;
  characterCount: number;
  promptVersion: string;
}

export async function draftLinkedIn(input: LinkedInDraftInput): Promise<LinkedInDraft> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `Draft a LinkedIn connection request from ${input.advisorName} to ${input.fullName} (${input.title ?? ""} at ${input.company ?? ""}).

Rapport hooks: ${input.rapportHooks.map(h => h.value).join(", ")}
${input.warmPath ? `Mutual connection: ${input.warmPath.clientName}` : ""}

RULES:
- MAX 300 characters for connection note
- Natural, not salesy
- Reference something specific about them
- FINRA compliant

Return JSON: {"connectionNote": "...", "inMailBody": null}`,
    }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response");
  const parsed = JSON.parse(content.text) as { connectionNote: string; inMailBody: string | null };

  return {
    connectionNote: parsed.connectionNote,
    inMailBody: parsed.inMailBody,
    characterCount: parsed.connectionNote.length,
    promptVersion: "v1.0.0",
  };
}
