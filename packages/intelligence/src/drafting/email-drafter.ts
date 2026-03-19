import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export interface EmailDraftInput {
  fullName: string;
  firstName: string;
  company: string | null;
  title: string | null;
  signalType: string;
  signalDescription: string;
  rapportHooks: Array<{ type: string; value: string; openerSuggestion: string }>;
  warmPath: { clientName: string; relationship: string } | null;
  variant: "rapport" | "value" | "warm-intro";
  advisorName: string;
  advisorFirm: string;
}

export interface EmailDraft {
  subject: string;
  body: string;
  wordCount: number;
  variant: string;
  promptVersion: string;
}

const PROMPT_VERSION = "v1.0.0";

export async function draftEmail(input: EmailDraftInput): Promise<EmailDraft> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";
  const prompt = buildEmailPrompt(input);

  const response = await anthropic.messages.create({
    model,
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected AI response type");
  }

  try {
    const parsed = JSON.parse(content.text) as { subject: string; body: string };
    const wordCount = parsed.body.split(/\s+/).filter(Boolean).length;

    return {
      subject: parsed.subject,
      body: parsed.body,
      wordCount,
      variant: input.variant,
      promptVersion: PROMPT_VERSION,
    };
  } catch {
    throw new Error("Failed to parse AI email draft");
  }
}

function buildEmailPrompt(input: EmailDraftInput): string {
  const hooks = input.rapportHooks
    .map((h) => `- ${h.type}: ${h.value} (opener: ${h.openerSuggestion})`)
    .join("\n");

  const warmIntro = input.warmPath
    ? `\nWarm path: You know ${input.warmPath.clientName} (${input.warmPath.relationship})`
    : "";

  return `Draft a ${input.variant} email from ${input.advisorName} (${input.advisorFirm}) to ${input.fullName}.

Context:
- Recipient: ${input.fullName}, ${input.title ?? ""} at ${input.company ?? ""}
- Signal: ${input.signalType} — ${input.signalDescription}
- Rapport hooks:\n${hooks}${warmIntro}

RULES:
- MAX 150 words in body
- Variant "${input.variant}":
  - rapport: Lead with personal connection, light mention of how you can help
  - value: Lead with specific value you bring for their situation
  - warm-intro: Reference mutual connection, build on trust
- Professional but warm tone
- One clear call to action (15-min call)
- No generic "hope this finds you well"
- No attachments or links in first email
- FINRA 2210 compliant: no guarantees, no misleading claims

Return JSON only: {"subject": "...", "body": "..."}`;
}
