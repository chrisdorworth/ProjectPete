import Anthropic from "@anthropic-ai/sdk";

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

export async function extractEntities(
  text: string,
  context: string,
): Promise<NERResult> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

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
${text.slice(0, 4000)}

Return ONLY valid JSON, no other text.`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return emptyNERResult();
  }

  try {
    return JSON.parse(content.text) as NERResult;
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
