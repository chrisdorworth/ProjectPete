import { runQuery } from "@meridian/graph";

export interface CompetitorInfo {
  detected: boolean;
  advisorName: string | null;
  firmName: string | null;
  confidence: number;
  source: string;
}

export async function detectCompetitor(leadId: string): Promise<CompetitorInfo> {
  const result = await runQuery(
    `MATCH (lead:Lead {id: $leadId})-[:ADVISED_BY]->(advisor:Advisor)
     RETURN advisor.name AS advisorName, advisor.firm AS firmName`,
    { leadId },
    "READ",
  );

  if (result.records.length > 0) {
    const record = result.records[0]!;
    return {
      detected: true,
      advisorName: record.get("advisorName") as string | null,
      firmName: record.get("firmName") as string | null,
      confidence: 0.8,
      source: "graph",
    };
  }

  return {
    detected: false,
    advisorName: null,
    firmName: null,
    confidence: 0,
    source: "none",
  };
}
