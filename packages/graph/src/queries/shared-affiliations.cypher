// Find shared affiliations between lead and clients
MATCH (lead:Lead {id: $leadId})-[r1]->(affiliation)
WHERE affiliation:School OR affiliation:Club OR affiliation:Church OR affiliation:Board OR affiliation:Company
WITH lead, affiliation, type(r1) AS relType
MATCH (client:Client)-[r2]->(affiliation)
RETURN
  client.id AS clientId,
  client.name AS clientName,
  affiliation.name AS sharedAffiliation,
  labels(affiliation)[0] AS affiliationType,
  relType AS leadRelationship,
  type(r2) AS clientRelationship
ORDER BY affiliationType, affiliation.name
