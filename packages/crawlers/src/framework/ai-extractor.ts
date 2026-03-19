import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export interface NERResult {
  persons: Array<{
    name: string;
    title: string | null;
    company: string | null;
    role: string | null;
  }>;
  organizations: Array<{
    name: string;
    type: string | null;
  }>;
  moneyAmounts: Array<{
    amount: string;
    context: string;
  }>;
  locations: Array<{
    city: string | null;
    county: string | null;
    state: string | null;
  }>;
  dates: Array<{
    date: string;
    context: string;
  }>;
  eventType: string | null;
  confidence: number;
}

const NERResultSchema = z.object({
  persons: z.array(
    z.object({
      name: z.string(),
      title: z.string().nullable(),
      company: z.string().nullable(),
      role: z.string().nullable(),
    }),
  ),
  organizations: z.array(
    z.object({
      name: z.string(),
      type: z.string().nullable(),
    }),
  ),
  moneyAmounts: z.array(
    z.object({
      amount: z.string(),
      context: z.string(),
    }),
  ),
  locations: z.array(
    z.object({
      city: z.string().nullable(),
      county: z.string().nullable(),
      state: z.string().nullable(),
    }),
  ),
  dates: z.array(
    z.object({
      date: z.string(),
      context: z.string(),
    }),
  ),
  eventType: z
    .enum([
      "deed_transfer",
      "business_dissolution",
      "probate_filing",
      "court_settlement",
      "professional_retirement",
      "liquidity_event",
      "executive_change",
      "acquisition",
    ])
    .nullable(),
  confidence: z.number().min(0).max(1),
});

/**
 * Sanitize crawled text before inserting into the AI prompt.
 * Strips patterns that could be used for prompt injection:
 * - Lines that look like system/assistant role markers
 * - Markdown-style instruction overrides
 * - Common injection delimiters
 */
function sanitizeForPrompt(text: string): string {
  return text
    // Strip lines that attempt role impersonation
    .replace(/^(system|assistant|human)\s*:/gim, "[filtered]:")
    // Strip common prompt injection delimiters
    .replace(/<\/?(?:system|prompt|instruction|message)[^>]*>/gi, "")
    // Strip attempts to close/reopen prompt blocks
    .replace(/```\s*(?:system|prompt|instruction)/gi, "```")
    // Strip "ignore previous instructions" style attacks
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions|prompts|rules)/gi, "[filtered]")
    // Strip lines that try to redefine the task
    .replace(/^(?:new\s+)?(?:task|instruction|rule|prompt)\s*:/gim, "[filtered]:")
    // Limit consecutive newlines to reduce whitespace injection
    .replace(/\n{4,}/g, "\n\n\n");
}

export async function extractEntities(
  text: string,
  context: string,
): Promise<NERResult> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const sanitizedText = sanitizeForPrompt(text.slice(0, 4000));

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Extract named entities from the following ${context} text. Return a JSON object with these fields:
- persons: array of {name, title, company, role}
- organizations: array of {name, type}
- moneyAmounts: array of {amount (in cents as string), context}
- locations: array of {city, county, state}
- dates: array of {date (ISO format), context}
- eventType: one of [deed_transfer, business_dissolution, probate_filing, court_settlement, professional_retirement, liquidity_event, executive_change, acquisition] or null
- confidence: 0.0-1.0

TEXT:
${sanitizedText}

Return ONLY valid JSON, no other text.`,
      },
    ],
  });

  const content = response.content[0] as { type: string; text?: string } | undefined;
  if (!content || content.type !== "text") {
    return emptyNERResult();
  }

  try {
    const parsed = JSON.parse(content.text);
    const validated = NERResultSchema.safeParse(parsed);
    if (!validated.success) {
      return emptyNERResult();
    }
    return validated.data;
  } catch {
    return emptyNERResult();
  }
}

function emptyNERResult(): NERResult {
  return {
    persons: [],
    organizations: [],
    moneyAmounts: [],
    locations: [],
    dates: [],
    eventType: null,
    confidence: 0,
  };
}
