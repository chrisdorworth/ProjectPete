import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;
function getClient(): Anthropic { if (!client) client = new Anthropic(); return client; }

export interface VoicemailDraftInput {
  fullName: string;
  firstName: string;
  signalType: string;
  rapportHooks: Array<{ type: string; value: string }>;
  advisorName: string;
  advisorPhone: string;
}

export interface VoicemailDraft {
  script: string;
  wordCount: number;
  estimatedSeconds: number;
  promptVersion: string;
}

export async function draftVoicemail(input: VoicemailDraftInput): Promise<VoicemailDraft> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const response = await anthropic.messages.create({
    model,
    max_tokens: 256,
    messages: [{
      role: "user",
      content: `Draft a 30-second ringless voicemail script from ${input.advisorName} to ${input.firstName}.

Signal: ${input.signalType}
Rapport hooks: ${input.rapportHooks.map(h => h.value).join(", ")}
Callback: ${input.advisorPhone}

RULES:
- MAX 75 words (30 seconds)
- Warm, professional tone
- Reference one specific rapport hook
- Include callback number at end
- TCPA compliant — no pressure
- FINRA compliant — no guarantees

Return JSON: {"script": "..."}`,
    }],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Unexpected AI response");
  const parsed = JSON.parse(content.text) as { script: string };
  const wordCount = parsed.script.split(/\s+/).filter(Boolean).length;

  return {
    script: parsed.script,
    wordCount,
    estimatedSeconds: Math.round(wordCount * 0.4 * 10) / 10,
    promptVersion: "v1.0.0",
  };
}
