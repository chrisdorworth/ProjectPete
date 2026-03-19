// Detect if lead has an existing advisor relationship
MATCH (lead:Lead {id: $leadId})-[:ADVISED_BY]->(advisor:Advisor)
RETURN
  advisor.id AS advisorId,
  advisor.name AS advisorName,
  advisor.firm AS firmName
