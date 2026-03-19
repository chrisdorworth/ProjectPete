// Find shortest warm introduction path from lead to any existing client
// Returns paths up to 3 hops, ordered by proximity

MATCH path = shortestPath(
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
LIMIT 5
