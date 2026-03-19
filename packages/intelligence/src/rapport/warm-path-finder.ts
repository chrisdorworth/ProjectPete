import { runQuery } from "@meridian/graph";

export interface WarmPath {
  clientId: string;
  clientName: string;
  relationship: string;
  proximity: number;
  mutual: string | null;
  pathDescription: string;
}

export async function findWarmPaths(leadId: string): Promise<WarmPath[]> {
  const result = await runQuery(
    `MATCH path = shortestPath(
      (lead:Lead {id: $leadId})-[*..3]-(client:Client)
    )
    WHERE lead <> client
    RETURN
      client.id AS clientId,
      client.name AS clientName,
      length(path) AS proximity,
      [r IN relationships(path) | type(r)] AS relationshipTypes,
      [n IN nodes(path) | coalesce(n.name, n.id)] AS nodeNames
    ORDER BY proximity ASC
    LIMIT 5`,
    { leadId },
    "READ",
  );

  return result.records.map((record) => {
    const relTypes = record.get("relationshipTypes") as string[];
    const nodeNames = record.get("nodeNames") as string[];
    const proximity = (record.get("proximity") as { toNumber(): number }).toNumber();

    return {
      clientId: record.get("clientId") as string,
      clientName: record.get("clientName") as string,
      relationship: relTypes.join(" → "),
      proximity,
      mutual: nodeNames.length > 2 ? nodeNames[1] ?? null : null,
      pathDescription: nodeNames.join(" → "),
    };
  });
}
