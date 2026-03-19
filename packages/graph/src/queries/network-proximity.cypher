// Calculate network distance from lead to nearest client
MATCH (lead:Lead {id: $leadId})
OPTIONAL MATCH path = shortestPath((lead)-[*..5]-(client:Client))
WHERE lead <> client
WITH lead, min(length(path)) AS minDistance
RETURN coalesce(minDistance, 99) AS networkProximity
