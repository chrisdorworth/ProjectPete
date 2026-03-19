import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export interface RapportHook {
  type: string;
  value: string;
  source: string;
  confidence: number;
  openerSuggestion: string;
}

export interface RapportInput {
  fullName: string | null;
  company: string | null;
  title: string | null;
  linkedinUrl: string | null;
  almaMater: string | null;
  military: string | null;
  hobbies: string[];
  boardMemberships: string[];
  charityWork: string[];
  newsArticles: string[];
  socialPosts: string[];
}

export async function extractRapportHooks(input: RapportInput): Promise<RapportHook[]> {
  const anthropic = getClient();
  const model = process.env["CLAUDE_MODEL"] ?? "claude-sonnet-4-20250514";

  const context = buildContext(input);

  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a rapport-building specialist for financial advisors. Extract personal connection hooks from this lead data.

${context}

Find 2-5 rapport hooks. For each, provide a natural conversation opener.

Types: alma_mater, military, hobby, board_membership, charity, sports_team, hometown, career_achievement, shared_interest, family, travel

Return JSON array only:
[{"type": "...", "value": "...", "source": "where you found this", "confidence": 0.0-1.0, "openerSuggestion": "natural conversation opener"}]`,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") return [];

  try {
    return JSON.parse(content.text) as RapportHook[];
  } catch {
    return [];
  }
}

function buildContext(input: RapportInput): string {
  const parts: string[] = [];
  if (input.fullName) parts.push(`Name: ${input.fullName}`);
  if (input.company) parts.push(`Company: ${input.company}`);
  if (input.title) parts.push(`Title: ${input.title}`);
  if (input.almaMater) parts.push(`Education: ${input.almaMater}`);
  if (input.military) parts.push(`Military: ${input.military}`);
  if (input.hobbies.length) parts.push(`Interests: ${input.hobbies.join(", ")}`);
  if (input.boardMemberships.length) parts.push(`Boards: ${input.boardMemberships.join(", ")}`);
  if (input.charityWork.length) parts.push(`Charity: ${input.charityWork.join(", ")}`);
  if (input.newsArticles.length) parts.push(`Recent news:\n${input.newsArticles.join("\n")}`);
  if (input.socialPosts.length) parts.push(`Social posts:\n${input.socialPosts.join("\n")}`);
  return parts.join("\n");
}
